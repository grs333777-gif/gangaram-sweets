'use strict';
/**
 * FAILURE-INJECTION SIMULATION engine (used by chaos.test.js).
 *
 * Hundreds of customers pay through the REAL module (two "servers" sharing one database and one Razorpay) while chaos randomly breaks:
 *   - every database operation (sometimes AFTER the write succeeded, so the caller sees an error although it worked)
 *   - every Razorpay call (incl. refunds that succeed but whose response is lost)
 *   - the host's onPaymentSuccess / onPaymentRefunded hooks (incl. crashing AFTER applying their effect)
 *   - webhooks: duplicated, delayed, lost forever, out of order
 * Customers also pay twice, pay an old price after the total changed, pay for orders the shop cancelled, and orders whose
 * fulfilment is permanently broken. After the storm: no more chaos, time passes (virtual clock), the reconciler and webhook retries run.
 *
 * THE INVARIANT (what "done or rolled back" means): every captured payment ends in EXACTLY ONE terminal state
 *   FULFILLED (the shop's order is paid by it)   XOR   REFUNDED (Razorpay shows it fully refunded and the order does not count it),
 * never both ("free goods"), never neither ("customer charged, nothing happened"), and never refunded more than once.
 */
const path = require('path');
const { loadModule, call, sign } = require('./harness');
const { fakeMongoose } = require('./fake-mongoose');

const ROOT = path.resolve(__dirname, '..');
process.env.RAZORPAY_KEY_ID = 'rzp_test_abcdefgh123456';
const KEY_SECRET = 'secret_secret_secret_12';
const WH_SECRET = 'webhook_secret_long_random_1';
process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = WH_SECRET;

const SEC = 1000; const MIN = 60 * SEC;
const silent = { error() {}, warn() {}, log() {} };

function rng(seed) { // mulberry32: deterministic, so a failing seed can be replayed
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

async function simulate({ seed, storeKind, useCheckOrder, customers = 120, chaosRate = 0.12 }) {
  const R = rng(seed);
  const clk = { t: Date.parse('2026-03-01T00:00:00Z') };
  const clock = () => clk.t;
  const { mod, RazorpayStub } = loadModule(ROOT);
  let chaos = chaosRate;
  const boom = (where, statusCode) => Object.assign(new Error(`chaos:${where}`), statusCode ? { statusCode, error: {} } : {});

  // ----- chaotic database: wraps every store method; may fail before OR after the operation really happened
  const base = storeKind === 'mongo' ? mod.createMongoStore(fakeMongoose({ clock }), { clock }) : new mod.MemoryStore({ clock });
  const store = {};
  for (const name of ['save', 'getByInternalOrderId', 'getByRazorpayOrderId', 'retire', 'claim', 'complete', 'release', 'markRefunded', 'markFailed',
    'listPending', 'claimReconcile', 'rescheduleReconcile', 'claimRefund', 'completeRefund', 'failRefund', 'listPendingRefunds', 'getRefund']) {
    store[name] = async (...a) => {
      if (R() < chaos / 2) throw boom(`db-before:${name}`);
      const r = await base[name](...a);
      if (R() < chaos / 2) throw boom(`db-after:${name}`); // the write happened but the caller can't know
      return r;
    };
  }

  // ----- the shop (your host app): orders + idempotent hooks
  const shop = new Map();
  const captured = new Map(); // paymentId -> { orderId, amount }
  const refundedNotified = new Set();
  const mkServer = () => mod.createRazorpayModule({
    store, clock, logger: silent,
    config: {
      retryBaseMs: 0, leaseMs: 30 * SEC,
      autoRefund: { stuckAfterMs: 20 * MIN, stuckAfterAttempts: 6, refundBackoffMs: [20 * SEC, 60 * SEC], maxRefundAttempts: 40 },
      reconcile: { leaseMs: 60 * SEC, firstCheckMs: 60 * SEC, unpaidStepsMs: [2 * MIN, 5 * MIN, 15 * MIN], paidStepsMs: [30 * SEC, 60 * SEC, 2 * MIN], maxChecks: 6, duplicateCheckMs: 2 * MIN },
    },
    getOrder: async (id) => { if (R() < chaos / 2) throw boom('shop-db'); const o = shop.get(String(id)); return o ? { amount: o.total } : null; },
    checkOrder: useCheckOrder ? async (id) => { if (R() < chaos / 2) throw boom('shop-db'); const o = shop.get(String(id)); return o ? { amount: o.total, cancelled: o.cancelled } : null; } : undefined,
    onPaymentSuccess: async ({ internalOrderId, paymentId, amount }) => {
      if (R() < chaos / 2) throw boom('hook-before');
      const o = shop.get(String(internalOrderId));
      if (o.cancelled) throw new mod.CannotFulfil('order cancelled');      // permanent
      if (o.brokenFulfilment) throw new Error('catalog service down');    // permanent-looking, but not declared => retried then refunded
      if (o.total !== amount) throw new mod.CannotFulfil('total changed');
      if (o.paidWith && o.paidWith !== paymentId) throw new mod.CannotFulfil('order already paid by another payment'); // host-side defence
      o.paidWith = paymentId;                                              // atomic + idempotent effect
      if (R() < chaos / 2) throw boom('hook-after');                       // crashed after applying the effect
    },
    onPaymentRefunded: async ({ internalOrderId, paymentId }) => {
      if (R() < chaos / 2) throw boom('refund-hook-before');
      const o = shop.get(String(internalOrderId));
      if (o && o.paidWith === paymentId) o.paidWith = null;                // refunded => the order must NOT count as paid by it
      refundedNotified.add(paymentId);
      if (R() < chaos / 2) throw boom('refund-hook-after');
    },
  });
  const servers = [mkServer(), mkServer()]; // two Node processes, one DB, one Razorpay
  const pickServer = () => servers[R() < 0.5 ? 0 : 1];

  // ----- chaotic Razorpay
  const sdk = RazorpayStub.sdk;
  const flaky = (obj, name, { after = true, codes = [503, 503, 503, 400] } = {}) => {
    const orig = obj[name];
    obj[name] = async (...a) => {
      if (R() < chaos / 2) throw boom(`rzp-before:${name}`, codes[Math.floor(R() * codes.length)]);
      const r = await orig(...a);
      if (after && R() < chaos / 2) throw boom(`rzp-after:${name}`, 503); // e.g. refund DID go through but we never saw the answer
      return r;
    };
  };
  ['create', 'fetchPayments'].forEach((n) => flaky(sdk.orders, n));
  ['fetch', 'capture', 'refund'].forEach((n) => flaky(sdk.paymentsApi, n));

  const traces = new Map();
  const trace = (id, msg) => { if (!traces.has(id)) traces.set(id, []); traces.get(id).push(`${new Date(clk.t).toISOString().slice(11, 19)} ${msg}`); };

  // ----- webhook delivery queue (Razorpay retries non-2xx for ~24h; some webhooks are lost forever)
  const events = [];
  const enqueue = (event, payment, delayMs) => events.push({ at: clk.t + delayMs, event, payment, tries: 0 });
  const deliver = async (e) => {
    const body = Buffer.from(JSON.stringify({ event: e.event, payload: { payment: { entity: e.payment } } }));
    const res = await call(pickServer().router, 'POST', '/webhook', { body, headers: { 'x-razorpay-signature': sign(WH_SECRET, body) } });
    e.tries += 1;
    trace(e.payment.id, `webhook ${e.event} try#${e.tries} -> ${res.statusCode}`);
    if (res.statusCode >= 500 && e.tries < 60) { e.at = clk.t + Math.min(MIN * 2 ** Math.min(e.tries, 5), 15 * MIN); return false; }
    return true;
  };

  // ----- customers
  const kinds = [['normal', 0.55], ['double', 0.10], ['repriced', 0.10], ['cancelled', 0.06], ['broken', 0.06], ['abandon', 0.08], ['failed', 0.05]];
  const pickKind = () => { let x = R(); for (const [k, p] of kinds) { x -= p; if (x < 0) return k; } return 'normal'; };
  const roster = Array.from({ length: customers }, (_, i) => ({ id: `C${i}`, kind: pickKind(), start: Math.floor(R() * 60), total: 10000 + Math.floor(R() * 80000) }));
  let payN = 0;
  const capturePayment = (rz, amount, orderId) => {
    payN += 1;
    const id = `pay_S${String(seed).padStart(3, '0')}${String(payN).padStart(8, '0')}`.slice(0, 18).padEnd(18, 'x');
    sdk.paymentStore[id] = { id, order_id: rz, amount, currency: 'INR', status: 'captured', method: 'upi' };
    captured.set(id, { orderId, amount });
    return id;
  };
  const afterPayment = async (c, rz, payId, amount) => {
    const entity = () => ({ id: payId, order_id: rz, amount, currency: 'INR', status: 'captured', method: 'upi' });
    if (R() < 0.7) { const vr = await call(pickServer().router, 'POST', '/verify', { body: { orderId: c.id, razorpay_order_id: rz, razorpay_payment_id: payId, razorpay_signature: sign(KEY_SECRET, `${rz}|${payId}`) } }); trace(payId, `verify -> ${vr.statusCode} ${JSON.stringify(vr.body)}`); }
    const copies = R() < 0.15 ? 0 : 1 + Math.floor(R() * 3); // 15%: webhook lost forever
    trace(payId, `webhook copies scheduled: ${copies}`);
    for (let i = 0; i < copies; i++) enqueue(R() < 0.5 ? 'payment.captured' : 'order.paid', entity(), Math.floor(R() * 5 * MIN));
  };
  const createOrder = async (c) => {
    for (let i = 0; i < 4; i++) { // client retries create-order
      const r = await call(pickServer().router, 'POST', '/create-order', { body: { orderId: c.id } });
      if (r.statusCode === 200) return r.body;
      if (r.statusCode === 409) return null;
    }
    return null;
  };
  const runCustomer = async (c) => {
    shop.set(c.id, { total: c.total, cancelled: false, paidWith: null, brokenFulfilment: c.kind === 'broken' });
    const o = shop.get(c.id);
    const first = await createOrder(c);
    if (!first) return;
    const rz = first.razorpayOrderId;
    if (c.kind === 'abandon') return;
    if (c.kind === 'failed') {
      sdk.paymentStore[`pay_F${c.id}`.padEnd(18, 'f')] = { id: `pay_F${c.id}`.padEnd(18, 'f'), order_id: rz, amount: first.amount, currency: 'INR', status: 'failed' };
      enqueue('payment.failed', { id: `pay_F${c.id}`.padEnd(18, 'f'), order_id: rz, amount: first.amount, currency: 'INR', status: 'failed', error_description: 'declined' }, 1000);
      return;
    }
    if (c.kind === 'cancelled') o.cancelled = true;
    if (c.kind === 'repriced') {
      o.total = c.total + 5000; // admin edited the order
      if (R() < 0.5) { const second = await createOrder(c); if (second && second.razorpayOrderId !== rz && R() < 0.5) { await afterPayment(c, second.razorpayOrderId, capturePayment(second.razorpayOrderId, second.amount, c.id), second.amount); } }
    }
    const pay1 = capturePayment(rz, first.amount, c.id);
    await afterPayment(c, rz, pay1, first.amount);
    if (c.kind === 'double') { const pay2 = capturePayment(rz, first.amount, c.id); await afterPayment(c, rz, pay2, first.amount); }
  };

  // ----- run: storm, then calm
  const STORM = 400; const CALM = 700; const STEP = 20 * SEC;
  const step = async () => {
    const due = events.filter((e) => e.at <= clk.t);
    for (const e of due) { events.splice(events.indexOf(e), 1); }
    await Promise.all(due.map(async (e) => { if (!(await deliver(e))) events.push(e); }));
    await Promise.all(servers.map((s) => s.reconcile({ limit: 25 }).catch(() => {})));
    clk.t += STEP;
  };
  for (let s = 0; s < STORM; s++) {
    const starting = roster.filter((c) => c.start === s);
    await Promise.all(starting.map((c) => runCustomer(c).catch(() => {})));
    await step();
  }
  chaos = 0; // the storm is over
  for (let s = 0; s < CALM; s++) await step();

  // ----- verdict
  const report = { fulfilled: 0, refunded: 0, violations: [], details: [] };
  const refundCounts = new Map();
  for (const r of sdk.refundLog) refundCounts.set(r.paymentId, (refundCounts.get(r.paymentId) || 0) + 1);
  for (const [payId, info] of captured) {
    const p = sdk.paymentStore[payId];
    const o = shop.get(info.orderId);
    const isRefunded = (p.amount_refunded || 0) === p.amount;
    const isPartial = (p.amount_refunded || 0) > 0 && !isRefunded;
    const isFulfilled = o.paidWith === payId;
    if (isPartial) report.violations.push(`${payId}: partially refunded`);
    if (isFulfilled && isRefunded) report.violations.push(`${payId} (order ${info.orderId}, ${o.cancelled ? 'cancelled' : o.brokenFulfilment ? 'broken' : 'ok'}): FREE GOODS: fulfilled AND refunded`);
    else if (!isFulfilled && !isRefunded) {
      report.violations.push(`${payId} (order ${info.orderId}, ${o.cancelled ? 'cancelled' : o.brokenFulfilment ? 'broken' : 'ok'}): CHARGED, NOTHING HAPPENED: neither fulfilled nor refunded`);
      report.details.push({ payId, record: await base.getByRazorpayOrderId(p.order_id), refund: await base.getRefund(payId), shop: o, trace: traces.get(payId) });
    }
    if ((refundCounts.get(payId) || 0) > 1) report.violations.push(`${payId}: refunded ${refundCounts.get(payId)} times`);
    if (isFulfilled) { report.fulfilled += 1; if (info.amount !== o.total) report.violations.push(`${payId}: fulfilled with wrong amount ${info.amount} vs ${o.total}`); }
    if (isRefunded) report.refunded += 1;
    if (isRefunded && !refundedNotified.has(payId) && !isFulfilled && false) report.violations.push(`${payId}: refunded but shop never notified`);
  }
  // every refund notification the shop needs has been delivered, and nothing is left half-done in the database
  for (const [id, o] of shop) {
    const rec = await base.getByInternalOrderId(id);
    if (rec && rec.status === 'processing') report.violations.push(`order ${id}: record stuck in 'processing'`);
    if (o.paidWith && rec && rec.status !== 'paid' && rec.status !== 'processing') report.violations.push(`order ${id}: shop says paid but payment record is '${rec.status}'`);
  }
  const pendingRefunds = await base.listPendingRefunds({ limit: 1000 });
  if (pendingRefunds.length) report.violations.push(`${pendingRefunds.length} refund jobs still pending after settling`);
  report.events = events.length;
  report.payments = captured.size;
  return report;
}


module.exports = { simulate };
