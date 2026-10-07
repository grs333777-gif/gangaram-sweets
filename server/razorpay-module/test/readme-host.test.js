'use strict';
/**
 * The host-side hooks below are copied from README section 3 (only `Order` is a tiny in-memory model with MongoDB's
 * updateOne / findOne semantics: filter equality, dotted paths, modifiedCount). If this passes, the README example is correct.
 * node --test test/readme-host.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { loadModule, call, sign } = require('./harness');

const ROOT = path.resolve(__dirname, '..');
process.env.RAZORPAY_KEY_ID = 'rzp_test_abcdefgh123456';
process.env.RAZORPAY_KEY_SECRET = 'secret_secret_secret_12';
process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret_long_random_1';
const silent = { error() {}, warn() {}, log() {} };

// ---- minimal Order model with Mongo semantics
const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split('.'); let c = o; ks.slice(0, -1).forEach((k) => { c[k] = c[k] || {}; c = c[k]; }); c[ks.at(-1)] = v; };
function makeOrderModel() {
  const docs = new Map();
  const matches = (d, f) => Object.entries(f).every(([k, v]) => String(getPath(d, k)) === String(v));
  const q = (fn) => { const chain = { select() { return chain; }, lean: async () => fn() }; return chain; };
  return {
    docs,
    seed(o) { docs.set(o._id, { paymentStatus: 'Pending', orderStatus: 'PendingPayment', razorpay: {}, ...o }); },
    findOne: (f) => q(() => { const d = [...docs.values()].find((x) => matches(x, f)); return d ? JSON.parse(JSON.stringify(d)) : null; }),
    findById: (id) => q(() => (docs.has(id) ? JSON.parse(JSON.stringify(docs.get(id))) : null)),
    async updateOne(f, u) {
      const d = [...docs.values()].find((x) => matches(x, f));
      if (!d) return { matchedCount: 0, modifiedCount: 0 };
      for (const [k, v] of Object.entries(u.$set || {})) setPath(d, k, v);
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };
}

function setup() {
  const { mod, RazorpayStub } = loadModule(ROOT);
  const { CannotFulfil } = mod;
  const Order = makeOrderModel();
  Order.seed({ _id: 'ORD1', user: 'u1', totalPaise: 50000 });
  const requireLogin = (req, res, next) => { req.user = { _id: 'u1', name: 'A', email: 'a@x.in', phone: '999' }; next(); };
  const alerts = [];
  let lastOpts; const realCreate = mod.createRazorpayModule; mod.createRazorpayModule = (o) => { lastOpts = o; return realCreate(o); }; // lets a test call the hooks directly
  // ====== BEGIN: copied from README section 3 ======
  const razorpay = mod.createRazorpayModule({
    store: new mod.MemoryStore(), logger: silent, authenticate: requireLogin,
    getOrder: async (orderId, req) => {
      const o = await Order.findOne({ _id: orderId, user: req.user._id }).select('totalPaise paymentStatus').lean();
      return o && { amount: o.totalPaise, alreadyPaid: o.paymentStatus === 'Paid', customer: { name: req.user.name, email: req.user.email, contact: req.user.phone } };
    },
    checkOrder: async (orderId) => {
      const o = await Order.findById(orderId).select('totalPaise orderStatus').lean();
      return o && { amount: o.totalPaise, cancelled: o.orderStatus === 'Cancelled' };
    },
    onPaymentSuccess: async ({ internalOrderId, razorpayOrderId, paymentId, amount, method }) => {
      const r = await Order.updateOne(
        { _id: internalOrderId, totalPaise: amount, orderStatus: 'PendingPayment' },
        { $set: { paymentStatus: 'Paid', orderStatus: 'Confirmed', paidAt: new Date(),
          'razorpay.orderId': razorpayOrderId, 'razorpay.paymentId': paymentId, 'razorpay.method': method } },
      );
      if (r.modifiedCount === 1) return;
      const o = await Order.findById(internalOrderId).select('razorpay.paymentId').lean();
      if (o && o.razorpay && o.razorpay.paymentId === paymentId) return;
      throw new CannotFulfil('Order is cancelled, already paid by another payment, or its total changed');
    },
    onPaymentRefunded: async ({ internalOrderId, paymentId }) => {
      await Order.updateOne({ _id: internalOrderId, 'razorpay.paymentId': paymentId },
        { $set: { paymentStatus: 'Refunded', orderStatus: 'Cancelled' } });
    },
    onPaymentAnomaly: async (info) => { alerts.push(info); },
  });
  // ====== END: copied from README section 3 ======
  const rz = async () => (await call(razorpay.router, 'POST', '/create-order', { body: { orderId: 'ORD1' } })).body.razorpayOrderId;
  const pay = (r, id, amount = 50000) => { RazorpayStub.sdk.paymentStore[id] = { id, order_id: r, amount, currency: 'INR', status: 'captured', method: 'upi' }; };
  const hook = (id, r, amount = 50000) => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id, order_id: r, amount, currency: 'INR', status: 'captured', method: 'upi' } } } }));
    return call(razorpay.router, 'POST', '/webhook', { body, headers: { 'x-razorpay-signature': sign(process.env.RAZORPAY_WEBHOOK_SECRET, body) } });
  };
  const verify = (id, r) => call(razorpay.router, 'POST', '/verify', { body: { orderId: 'ORD1', razorpay_order_id: r, razorpay_payment_id: id, razorpay_signature: sign(process.env.RAZORPAY_KEY_SECRET, `${r}|${id}`) } });
  return { Order, razorpay, rz, pay, hook, verify, alerts, hooks: () => lastOpts, CannotFulfil, sdk: () => RazorpayStub.sdk };
}
const A = 'pay_AAAAAAAAAAAA'; const B = 'pay_BBBBBBBBBBBB';

test('README flow: normal payment confirms the order exactly once (verify + webhook racing)', async () => {
  const t = setup(); const r = await t.rz(); t.pay(r, A);
  await Promise.all([t.verify(A, r), t.hook(A, r), t.hook(A, r)]);
  const o = t.Order.docs.get('ORD1');
  assert.deepEqual([o.orderStatus, o.paymentStatus, o.razorpay.paymentId], ['Confirmed', 'Paid', A]);
  assert.equal(t.sdk().refundLog.length, 0);
});

test('README flow: customer pays twice => order stays Confirmed by the first, the second payment is refunded', async () => {
  const t = setup(); const r = await t.rz(); t.pay(r, A); t.pay(r, B);
  await t.hook(A, r); await t.hook(B, r); await t.hook(B, r);
  const o = t.Order.docs.get('ORD1');
  assert.deepEqual([o.orderStatus, o.razorpay.paymentId], ['Confirmed', A]);
  assert.deepEqual(t.sdk().refundLog.map((x) => x.paymentId), [B]);
});

test('README flow: order cancelled before the payment landed => refunded, stays Cancelled', async () => {
  const t = setup(); const r = await t.rz(); t.pay(r, A);
  t.Order.docs.get('ORD1').orderStatus = 'Cancelled';
  await t.hook(A, r);
  assert.equal(t.Order.docs.get('ORD1').orderStatus, 'Cancelled');
  assert.deepEqual(t.sdk().refundLog.map((x) => x.paymentId), [A]);
});

test('README flow: total changed after checkout started => refunded, never confirmed at the old price', async () => {
  const t = setup(); const r = await t.rz(); t.pay(r, A, 50000);
  t.Order.docs.get('ORD1').totalPaise = 90000;
  assert.equal((await t.verify(A, r)).statusCode, 409);
  await t.hook(A, r);
  assert.notEqual(t.Order.docs.get('ORD1').orderStatus, 'Confirmed');
  assert.equal(t.sdk().refundLog.length, 1);
});

test('README flow: onPaymentSuccess itself is idempotent for the same payment, and refuses a different one', async () => {
  const t = setup(); const r = await t.rz();
  const info = (paymentId) => ({ internalOrderId: 'ORD1', razorpayOrderId: r, paymentId, amount: 50000, method: 'upi' });
  await t.hooks().onPaymentSuccess(info(A));                    // first run applies it
  const after1 = JSON.stringify(t.Order.docs.get('ORD1'));
  await t.hooks().onPaymentSuccess(info(A));                    // module re-runs it (lease expiry / retry): silent success
  await t.hooks().onPaymentSuccess(info(A));
  assert.equal(JSON.stringify(t.Order.docs.get('ORD1')), after1);
  await assert.rejects(t.hooks().onPaymentSuccess(info(B)), (e) => e instanceof t.CannotFulfil); // a different payment must never take over
});

test('README flow: refund from the Razorpay dashboard of the confirming payment cancels the order', async () => {
  const t = setup(); const r = await t.rz(); t.pay(r, A);
  await t.hook(A, r);
  const body = Buffer.from(JSON.stringify({ event: 'refund.processed', payload: { payment: { entity: { id: A, order_id: r, amount: 50000, currency: 'INR', status: 'refunded', amount_refunded: 50000 } }, refund: { entity: { id: 'rfnd_X', amount: 50000 } } } }));
  await call(t.razorpay.router, 'POST', '/webhook', { body, headers: { 'x-razorpay-signature': sign(process.env.RAZORPAY_WEBHOOK_SECRET, body) } });
  const o = t.Order.docs.get('ORD1');
  assert.deepEqual([o.paymentStatus, o.orderStatus], ['Refunded', 'Cancelled']);
});

test('README flow: someone else\'s order id is not payable (getOrder ownership filter)', async () => {
  const t = setup(); t.Order.seed({ _id: 'OTHER', user: 'u2', totalPaise: 100 });
  const r = await call(t.razorpay.router, 'POST', '/create-order', { body: { orderId: 'OTHER' } });
  assert.equal(r.statusCode, 404);
});
