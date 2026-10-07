'use strict';
/** Run:  node --test test/run.js   (no npm install needed; uses stand-ins from test/harness.js)
 *        STORE=mongo node --test test/run.js    (same suite through stores/mongo-store.js on a fake Mongoose) */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { loadModule, call, sign, limiterCalls } = require('./harness');
const { fakeMongoose } = require('./fake-mongoose');

const ROOT = path.resolve(__dirname, '..');
const KEY_SECRET = 'secret_secret_secret_12';
const WH_SECRET = 'webhook_secret_long_random_1';
process.env.RAZORPAY_KEY_ID = 'rzp_test_abcdefgh123456';
process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = WH_SECRET;

const MIN = 60 * 1000; const HOUR = 60 * MIN;
const silent = { error() {}, warn() {}, log() {} };
const hookReq = (event, payment, extraPayload = {}, secret = WH_SECRET) => {
  const body = Buffer.from(JSON.stringify({ event, payload: { payment: { entity: payment }, ...extraPayload } }));
  return { body, headers: { 'x-razorpay-signature': sign(secret, body) } };
};
const cap = (id, orderId, amount = 50000, extra = {}) => ({ id, order_id: orderId, amount, currency: 'INR', status: 'captured', method: 'upi', ...extra });
const PAY_A = 'pay_AAAAAAAAAAAA'; const PAY_B = 'pay_BBBBBBBBBBBB';

/** fresh module + fake Razorpay + virtual clock per test */
function setup(over = {}) {
  const clk = { t: Date.parse('2026-01-01T00:00:00Z') };
  const clock = () => clk.t;
  const { mod, RazorpayStub } = loadModule(ROOT);
  const makeStore = () => (process.env.STORE === 'mongo' ? mod.createMongoStore(fakeMongoose({ clock }), { clock }) : new mod.MemoryStore({ clock }));
  const store = over.store || makeStore();
  const calls = { success: [], failed: [], anomalies: [], refunded: [] };
  const host = { total: over.total ?? 50000, cancelled: false };
  const build = (extra = {}) => mod.createRazorpayModule({
    store, clock, logger: silent,
    getOrder: async (id) => (id === 'NOPE' ? null : { amount: host.total, customer: { name: 'T' } }),
    checkOrder: over.checkOrder ? async () => ({ amount: host.total, cancelled: host.cancelled }) : undefined,
    onPaymentSuccess: over.onPaymentSuccess || (async (i) => { calls.success.push(i); }),
    onPaymentFailed: async (i) => { calls.failed.push(i); },
    onPaymentRefunded: async (i) => { calls.refunded.push(i); },
    onPaymentAnomaly: async (i) => { calls.anomalies.push(i); },
    config: { retryBaseMs: 1, ...over.config },
    ...over.opts, ...extra,
  });
  const api = { calls, store, mod, host, clk, build, m: build() };
  api.advance = (ms) => { clk.t += ms; };
  api.sdk = () => RazorpayStub.sdk;
  api.create = (orderId = 'ORD1', m = api.m) => call(m.router, 'POST', '/create-order', { body: { orderId } });
  api.verify = (orderId, rz, payId, sig, m = api.m) => call(m.router, 'POST', '/verify', {
    body: { orderId, razorpay_order_id: rz, razorpay_payment_id: payId, razorpay_signature: sig ?? sign(KEY_SECRET, `${rz}|${payId}`) },
  });
  api.webhook = (event, payment, extra, secret, m = api.m) => call(m.router, 'POST', '/webhook', hookReq(event, payment, extra, secret));
  api.pay = (rz, payId, amount, extra) => { api.sdk().paymentStore[payId] = cap(payId, rz, amount, extra); };
  api.rec = (rz) => store.getByRazorpayOrderId(rz);
  return api;
}

// =====================================================================  basics / validation
test('module loads with the documented folder layout', () => { assert.doesNotThrow(() => setup()); });

test('create-order: server decides the amount; client cannot influence it', async () => {
  const t = setup({ total: 123456 });
  const r = await call(t.m.router, 'POST', '/create-order', { body: { orderId: 'ORD1', amount: 1 } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.amount, 123456);
  assert.equal(r.headers['Cache-Control'], 'no-store');
  assert.ok(!JSON.stringify(r.body).includes(KEY_SECRET));
});

test('create-order: validation + unknown order', async () => {
  const t = setup();
  assert.equal((await call(t.m.router, 'POST', '/create-order', { body: { orderId: { $ne: 1 } } })).statusCode, 400);
  assert.equal((await call(t.m.router, 'POST', '/create-order', { body: {} })).statusCode, 400);
  assert.equal((await t.create('NOPE')).statusCode, 404);
});

test('AMOUNT RAILS: zero, below minimum, above ceiling, float, NaN, negative are all refused before Razorpay is touched', async () => {
  for (const [total, expected] of [[0, 422], [99, 422], [-500, 422], [50000001, 422], [499.5, 500], [NaN, 500], [Infinity, 500]]) {
    const t = setup({ total });
    const r = await t.create();
    assert.equal(r.statusCode, expected, `total=${total}`);
    assert.equal(t.sdk().calls.create, 0, 'Razorpay must not even be called');
  }
  const ok = setup({ total: 100 }); // exactly the minimum (Re 1) is fine
  assert.equal((await ok.create()).statusCode, 200);
});

test('AMOUNT RAILS: if Razorpay ever returns a different amount than asked, nothing is saved or shown', async () => {
  const t = setup();
  t.create; // construct sdk lazily via first call below
  const { RazorpayStub } = loadModule(ROOT); // separate instance, only to get at class shape (not used)
  void RazorpayStub;
  const t2 = setup();
  await t2.create('WARM'); // builds the SDK
  const sdk = t2.sdk();
  const orig = sdk.orders.create;
  sdk.orders.create = async (p) => ({ ...(await orig(p)), amount: 100 }); // Razorpay "lies": Rs 1 instead of Rs 500
  const r = await t2.create('ORD2');
  assert.equal(r.statusCode, 500);
  assert.equal(await t2.store.getByInternalOrderId('ORD2'), null);
});

test('IDEMPOTENCY: double-click / concurrent create-order => exactly ONE Razorpay order', async () => {
  const t = setup();
  const rs = await Promise.all([t.create(), t.create(), t.create(), t.create(), t.create()]);
  assert.equal(new Set(rs.map((r) => r.body.razorpayOrderId)).size, 1);
  assert.equal(t.sdk().calls.create, 1);
  assert.equal((await t.create()).body.razorpayOrderId, rs[0].body.razorpayOrderId); // reused
  assert.equal(t.sdk().calls.create, 1);
});

// =====================================================================  verify
test('verify: forged signature rejected without touching DB or Razorpay', async () => {
  const t = setup();
  const c = await t.create();
  const v = await t.verify('ORD1', c.body.razorpayOrderId, PAY_A, 'a'.repeat(64));
  assert.equal(v.statusCode, 400);
  assert.equal(t.sdk().calls.fetch, 0);
  assert.equal(t.calls.success.length, 0);
});

test('verify: happy path fulfils once, and is replay-safe', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  const v = await t.verify('ORD1', rz, PAY_A);
  assert.deepEqual([v.statusCode, v.body.status], [200, 'paid']);
  const v2 = await t.verify('ORD1', rz, PAY_A);
  assert.deepEqual([v2.statusCode, v2.body.status], [200, 'paid']);
  assert.equal(t.calls.success.length, 1);
  assert.equal((await t.rec(rz)).status, 'paid');
  assert.equal(t.sdk().calls.refund, 0);
});

test("verify: someone else's order / mismatched order id is rejected", async () => {
  const t = setup();
  const c = await t.create('ORD1'); await t.create('ORD2');
  t.pay(c.body.razorpayOrderId, PAY_A);
  assert.equal((await t.verify('ORD2', c.body.razorpayOrderId, PAY_A)).statusCode, 400); // paid ORD1, claims ORD2
  assert.equal(t.calls.success.length, 0);
});

test('payment status failed => 402, never "pending"; refunded => 409', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A, 50000, { status: 'failed' });
  assert.equal((await t.verify('ORD1', rz, PAY_A)).statusCode, 402);
  t.pay(rz, PAY_B, 50000, { status: 'refunded' });
  assert.equal((await t.verify('ORD1', rz, PAY_B)).statusCode, 409);
  assert.equal(t.calls.success.length, 0);
});

test('manual-capture accounts: authorized payment is captured then fulfilled', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A, 50000, { status: 'authorized' });
  assert.equal((await t.verify('ORD1', rz, PAY_A)).body.status, 'paid');
  assert.equal(t.sdk().calls.capture, 1);
});

test('NETWORK: Razorpay API down during verify => 202 pending (not an error); webhook finishes later', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  const v = await t.verify('ORD1', rz, PAY_A); // payment unknown to fake => fetch throws
  assert.deepEqual([v.statusCode, v.body.status], [202, 'pending']);
  await t.webhook('payment.captured', cap(PAY_A, rz));
  assert.equal(t.calls.success.length, 1);
});

test('NETWORK: transient Razorpay errors (502 x2) are retried transparently; customer sees success', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  const sdk = t.sdk(); const orig = sdk.paymentsApi.fetch; let n = 0;
  sdk.paymentsApi.fetch = async (id) => { n += 1; if (n <= 2) throw Object.assign(new Error('bad gateway'), { statusCode: 502 }); return orig(id); };
  const v = await t.verify('ORD1', rz, PAY_A);
  assert.deepEqual([v.statusCode, v.body.status], [200, 'paid']);
  assert.equal(n, 3);
});

test('NETWORK: non-transient Razorpay errors (400) are NOT retried', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  const sdk = t.sdk(); let n = 0;
  sdk.paymentsApi.fetch = async () => { n += 1; throw Object.assign(new Error('bad request'), { statusCode: 400, error: {} }); };
  await t.verify('ORD1', rz, PAY_A);
  assert.equal(n, 1);
});

// =====================================================================  races / exactly-once
test('RACE: verify + webhook + webhook retries fired simultaneously => fulfilled exactly once', async () => {
  let runs = 0;
  const t = setup({ onPaymentSuccess: async () => { runs += 1; await new Promise((r) => setTimeout(r, 30)); } });
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  const results = await Promise.all([
    t.verify('ORD1', rz, PAY_A), t.webhook('payment.captured', cap(PAY_A, rz)), t.webhook('order.paid', cap(PAY_A, rz)),
    t.webhook('payment.captured', cap(PAY_A, rz)), t.verify('ORD1', rz, PAY_A),
  ]);
  assert.equal(runs, 1);
  for (const r of results) assert.ok([200, 202, 503].includes(r.statusCode), `unexpected ${r.statusCode}`);
  await t.webhook('payment.captured', cap(PAY_A, rz));
  assert.equal(runs, 1);
  assert.equal((await t.rec(rz)).status, 'paid');
  assert.equal(t.sdk().calls.refund, 0, 'losing the race must NEVER refund the real payment');
});

test('MULTI-SERVER: two server instances sharing one DB race on the same order', async () => {
  const t = setup({ onPaymentSuccess: async () => { await new Promise((r) => setTimeout(r, 10)); } });
  let runs = 0;
  const mk = () => t.build({ onPaymentSuccess: async () => { runs += 1; await new Promise((r) => setTimeout(r, 10)); } });
  const A = mk(); const B = mk(); // separate singleFlight maps, like two Node processes
  const [a, b] = await Promise.all([t.create('ORD1', A), t.create('ORD1', B)]);
  assert.equal(a.body.razorpayOrderId, b.body.razorpayOrderId, 'DB unique index must collapse both into ONE active order');
  const rz = a.body.razorpayOrderId;
  t.pay(rz, PAY_A);
  await Promise.all([t.verify('ORD1', rz, PAY_A, undefined, A), t.webhook('payment.captured', cap(PAY_A, rz), undefined, undefined, B)]);
  assert.equal(runs, 1);
});

test('store.save race: concurrent inserts for one order yield a single active record', async () => {
  const t = setup();
  const recs = await Promise.all(['order_AAAAAAAAAA01', 'order_AAAAAAAAAA02', 'order_AAAAAAAAAA03']
    .map((id) => t.store.save({ internalOrderId: 'X1', razorpayOrderId: id, amount: 500, currency: 'INR' })));
  assert.equal(new Set(recs.map((r) => r.razorpayOrderId)).size, 1);
});

test('FENCING: a slow worker whose lease expired cannot complete/release/refund over the new owner', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  const tokenA = await t.store.claim(rz, { paymentId: PAY_A, method: 'upi', leaseMs: 1000 });
  assert.ok(tokenA);
  assert.equal(await t.store.claim(rz, { paymentId: PAY_A, method: 'upi', leaseMs: 1000 }), null); // still leased
  t.advance(2000);
  const tokenB = await t.store.claim(rz, { paymentId: PAY_A, method: 'upi', leaseMs: 60000 });
  assert.ok(tokenB && tokenB !== tokenA);
  assert.equal(await t.store.complete(rz, tokenA), false);
  assert.equal(await t.store.release(rz, tokenA, {}), false);
  assert.equal(await t.store.markRefunded(rz, { token: tokenA, paymentId: PAY_A }), false);
  assert.equal((await t.rec(rz)).status, 'processing');
  assert.equal(await t.store.complete(rz, tokenB), true);
  assert.equal((await t.rec(rz)).status, 'paid');
});

test('BINDING: an order is tied to the first payment id that claims it', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  const tk = await t.store.claim(rz, { paymentId: PAY_A, method: 'upi', leaseMs: 1000 });
  await t.store.release(rz, tk, {});
  assert.equal(await t.store.claim(rz, { paymentId: PAY_B, method: 'upi', leaseMs: 1000 }), null);
  assert.ok(await t.store.claim(rz, { paymentId: PAY_A, method: 'upi', leaseMs: 1000 }));
});

// =====================================================================  failure handling: roll forward
test('fulfilment failure is NOT shown as an error; retry then completes it', async () => {
  let attempt = 0; const ok = [];
  const t = setup({ onPaymentSuccess: async (i) => { attempt += 1; if (attempt === 1) throw new Error('db down'); ok.push(i); } });
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  const v = await t.verify('ORD1', rz, PAY_A);
  assert.deepEqual([v.statusCode, v.body.status], [202, 'pending']);
  assert.equal((await t.rec(rz)).status, 'created'); // released for retry
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, rz))).statusCode, 200); // Razorpay retry
  assert.equal(ok.length, 1);
  assert.equal((await t.rec(rz)).status, 'paid');
  assert.equal(t.sdk().calls.refund, 0);
});

test('webhook returns 500 when fulfilment fails so Razorpay retries', async () => {
  const t = setup({ onPaymentSuccess: async () => { throw new Error('boom'); } });
  const rz = (await t.create()).body.razorpayOrderId;
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, rz))).statusCode, 500);
});

test('CRASH RECOVERY: worker dies mid-fulfilment; lease expires; reconciler finishes the order', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  assert.ok(await t.store.claim(rz, { paymentId: PAY_A, method: 'upi', leaseMs: 20000 })); // claimed, then the process "died"
  t.pay(rz, PAY_A);
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, rz))).statusCode, 503); // still leased -> retry later
  assert.equal((await t.m.reconcile()).fixed, 0); // not due yet
  t.advance(30000);
  const out = await t.m.reconcile();
  assert.equal(out.fixed, 1);
  assert.equal(t.calls.success.length, 1);
  assert.equal((await t.rec(rz)).status, 'paid');
});

test('RECONCILER: webhook never arrived and browser closed => payment still fulfilled', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  assert.equal((await t.m.reconcile()).checked, 0); // too early
  t.advance(3 * MIN + 1);
  const out = await t.m.reconcile();
  assert.equal(out.fixed, 1);
  assert.equal(t.calls.success[0].source, 'reconcile');
});

test('RECONCILER: abandoned carts get a bounded number of checks, then are left alone (no API hammering)', async () => {
  const t = setup();
  await t.create('A'); await t.create('B');
  for (let i = 0; i < 12; i++) { t.advance(13 * HOUR); await t.m.reconcile(); }
  assert.equal(t.sdk().calls.fetchPayments, 2 * 6); // 2 orders x maxChecks(6), then never again
});

test('RECONCILER: a transient Razorpay error does not use up a check or lose the payment', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  const sdk = t.sdk(); const orig = sdk.orders.fetchPayments; let fail = true;
  sdk.orders.fetchPayments = async (id) => { if (fail) throw Object.assign(new Error('boom'), { statusCode: 400 }); return orig(id); };
  t.advance(3 * MIN + 1);
  assert.equal((await t.m.reconcile()).fixed, 0);
  assert.equal((await t.rec(rz)).reconcileChecks, 0); // check not consumed
  fail = false; t.advance(2 * MIN);
  assert.equal((await t.m.reconcile()).fixed, 1);
});

test('RECONCILER scale: only DUE records are loaded; 5,000 not-yet-due carts cost nothing', async () => {
  const t = setup();
  for (let i = 0; i < 300; i++) await t.store.save({ internalOrderId: `B${i}`, razorpayOrderId: `order_BULK${String(i).padStart(10, '0')}`, amount: 500, currency: 'INR', nextReconcileAt: new Date(t.clk.t + HOUR) });
  await t.create('DUE'); t.advance(3 * MIN + 1);
  const pending = await t.store.listPending({ limit: 100 });
  assert.equal(pending.length, 1);
});

test('RECONCILER: two servers reconciling at once: each due record is checked by exactly one', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  t.advance(3 * MIN + 1);
  const A = t.build(); const B = t.build();
  const [ra, rb] = await Promise.all([A.reconcile(), B.reconcile()]);
  assert.equal(ra.fixed + rb.fixed, 1);
  assert.equal(t.sdk().calls.fetchPayments, 1);
  assert.equal(t.calls.success.length, 1);
});

// =====================================================================  failure handling: roll back (auto-refund)
test('COMPENSATION: customer pays the OLD order after the total changed => never fulfilled, refunded exactly once', async () => {
  const t = setup({ total: 50000 });
  const old = (await t.create()).body.razorpayOrderId;
  t.host.total = 500000;
  const fresh = await t.create();
  assert.notEqual(fresh.body.razorpayOrderId, old);
  assert.equal(fresh.body.amount, 500000);
  t.pay(old, PAY_A, 50000);
  const v = await t.verify('ORD1', old, PAY_A);
  assert.equal(v.statusCode, 409);
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, old, 50000))).statusCode, 200);
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, old, 50000))).statusCode, 200); // webhook retry
  assert.equal(t.calls.success.length, 0);
  assert.deepEqual(t.sdk().refundLog, [{ paymentId: PAY_A, amount: 50000 }]); // once, full amount
  assert.equal(t.calls.refunded.length, 1);
  assert.ok(t.calls.anomalies.length >= 1);
});

test('COMPENSATION: total changed WITHOUT a new create-order => verify refunds; later webhook cannot fulfil it', async () => {
  const t = setup({ total: 50000 });
  const rz = (await t.create()).body.razorpayOrderId;
  t.host.total = 90000; // admin edited the order after checkout began
  t.pay(rz, PAY_A, 50000);
  assert.equal((await t.verify('ORD1', rz, PAY_A)).statusCode, 409);
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, rz, 50000))).statusCode, 200);
  assert.equal(t.calls.success.length, 0);
  assert.equal(t.sdk().refundLog.length, 1);
  assert.equal((await t.rec(rz)).status, 'refunded');
  assert.equal((await t.create()).statusCode, 200); // and the customer can pay the new total
});

test('COMPENSATION: checkOrder() catches a cancelled order in the webhook path (no req/user there)', async () => {
  const t = setup({ checkOrder: true });
  const rz = (await t.create()).body.razorpayOrderId;
  t.host.cancelled = true;
  t.pay(rz, PAY_A);
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, rz))).statusCode, 200);
  assert.equal(t.calls.success.length, 0);
  assert.equal(t.sdk().refundLog.length, 1);
});

test('COMPENSATION: checkOrder() catches a re-priced order', async () => {
  const t = setup({ checkOrder: true });
  const rz = (await t.create()).body.razorpayOrderId;
  t.host.total = 99999;
  t.pay(rz, PAY_A);
  await t.webhook('payment.captured', cap(PAY_A, rz));
  assert.equal(t.calls.success.length, 0);
  assert.equal(t.sdk().refundLog.length, 1);
});

test('COMPENSATION: onPaymentSuccess throws CannotFulfil => refunded (no endless retry); customer can re-order', async () => {
  const t = setup({ onPaymentSuccess: async () => { throw new t.mod.CannotFulfil('out of stock'); } });
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  const v = await t.verify('ORD1', rz, PAY_A);
  assert.equal(v.statusCode, 409);
  assert.match(v.body.error, /refunded automatically/);
  assert.equal((await t.rec(rz)).status, 'refunded');
  assert.deepEqual(t.sdk().refundLog, [{ paymentId: PAY_A, amount: 50000 }]);
  assert.equal(t.calls.refunded[0].reason, 'cannot_fulfil');
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, rz))).statusCode, 200); // retry: no second refund
  assert.equal(t.sdk().refundLog.length, 1);
  const again = await t.create();
  assert.equal(again.statusCode, 200);
  assert.notEqual(again.body.razorpayOrderId, rz);
});

test('COMPENSATION: fulfilment failing for hours (stuck) => automatic refund after 6 attempts AND 2 hours', async () => {
  const t = setup({ onPaymentSuccess: async () => { throw new Error('catalog service is down'); } });
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  const codes = [];
  for (let i = 0; i < 6; i++) {
    codes.push((await t.webhook('payment.captured', cap(PAY_A, rz))).statusCode);
    if (i < 5) assert.equal(t.sdk().refundLog.length, 0, `must NOT refund early (attempt ${i + 1})`);
    t.advance(30 * MIN);
  }
  assert.deepEqual(codes.slice(0, 5), [500, 500, 500, 500, 500]);
  assert.equal(codes[5], 200);
  assert.equal(t.sdk().refundLog.length, 1);
  assert.equal((await t.rec(rz)).status, 'refunded');
});

test('COMPENSATION: a flaky blip that recovers before the threshold is NEVER refunded', async () => {
  let n = 0;
  const t = setup({ onPaymentSuccess: async () => { n += 1; if (n <= 4) throw new Error('blip'); } });
  const rz = (await t.create()).body.razorpayOrderId;
  for (let i = 0; i < 6; i++) { await t.webhook('payment.captured', cap(PAY_A, rz)); t.advance(30 * MIN); }
  assert.equal((await t.rec(rz)).status, 'paid');
  assert.equal(t.sdk().refundLog.length, 0);
});

test('autoRefund can be switched off: payment is kept and an alert says "refund manually"', async () => {
  const t = setup({ config: { autoRefund: false }, onPaymentSuccess: async () => { throw new (loadModule(ROOT).mod.CannotFulfil)('x'); } });
  const rz = (await t.create()).body.razorpayOrderId;
  await t.webhook('payment.captured', cap(PAY_A, rz));
  assert.equal(t.sdk().refundLog.length, 0);
  assert.equal(t.calls.anomalies.at(-1).action, 'manual_refund_required');
});

test('DOUBLE PAYMENT: a second captured payment on the same order is refunded; the first is fulfilled; replays change nothing', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A); t.pay(rz, PAY_B);
  await t.webhook('payment.captured', cap(PAY_A, rz));
  await t.webhook('payment.captured', cap(PAY_B, rz));
  await t.webhook('payment.captured', cap(PAY_B, rz)); // retry
  await t.webhook('payment.captured', cap(PAY_A, rz)); // retry
  assert.equal(t.calls.success.length, 1);
  assert.equal(t.calls.success[0].paymentId, PAY_A);
  assert.deepEqual(t.sdk().refundLog, [{ paymentId: PAY_B, amount: 50000 }]);
  assert.equal((await t.rec(rz)).status, 'paid');
});

test('DOUBLE PAYMENT: both payments hit at the very same instant => one fulfilled, the other refunded, never both/neither', async () => {
  const t = setup({ onPaymentSuccess: async (i) => { t.calls.success.push(i); await new Promise((r) => setTimeout(r, 15)); } });
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A); t.pay(rz, PAY_B);
  await Promise.all([
    t.webhook('payment.captured', cap(PAY_A, rz)), t.webhook('payment.captured', cap(PAY_B, rz)),
    t.verify('ORD1', rz, PAY_A), t.verify('ORD1', rz, PAY_B),
  ]);
  await t.webhook('payment.captured', cap(PAY_A, rz)); await t.webhook('payment.captured', cap(PAY_B, rz)); // settle via retries
  assert.equal(t.calls.success.length, 1);
  const winner = t.calls.success[0].paymentId; const loser = winner === PAY_A ? PAY_B : PAY_A;
  assert.deepEqual(t.sdk().refundLog.map((r) => r.paymentId), [loser]);
});

test('DOUBLE PAYMENT found later by the reconciler even if its webhook was lost', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  await t.webhook('payment.captured', cap(PAY_A, rz));
  t.pay(rz, PAY_B); // second payment; its webhook never arrives
  t.advance(21 * MIN);
  await t.m.reconcile();
  assert.deepEqual(t.sdk().refundLog, [{ paymentId: PAY_B, amount: 50000 }]);
  assert.equal(t.calls.success.length, 1);
  const cnt = t.sdk().calls.fetchPayments;
  t.advance(10 * HOUR); await t.m.reconcile();
  assert.equal(t.sdk().calls.fetchPayments, cnt, 'a finished order is not polled forever');
});

test('REFUND is exactly-once under concurrency (two workers compensate the same payment)', async () => {
  const t = setup({ total: 50000 });
  const old = (await t.create()).body.razorpayOrderId;
  t.host.total = 70000; await t.create();
  t.pay(old, PAY_A, 50000);
  await Promise.all([1, 2, 3, 4].map(() => t.webhook('payment.captured', cap(PAY_A, old, 50000))));
  assert.equal(t.sdk().refundLog.length, 1);
  assert.equal(t.sdk().calls.refund, 1, 'Razorpay was asked to refund once');
});

test('REFUND: Razorpay accepted the refund but the response was lost => retry notices and does NOT refund twice', async () => {
  const t = setup({ total: 50000 });
  const old = (await t.create()).body.razorpayOrderId;
  t.host.total = 70000; await t.create();
  t.pay(old, PAY_A, 50000);
  const sdk = t.sdk(); const real = sdk.paymentsApi.refund; let first = true;
  sdk.paymentsApi.refund = async (id, p) => { const r = await real(id, p); if (first) { first = false; throw Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }); } return r; };
  await t.webhook('payment.captured', cap(PAY_A, old, 50000));
  assert.equal(sdk.refundLog.length, 1); // Razorpay did refund
  assert.equal(t.calls.refunded.length, 0); // but we didn't learn it
  t.advance(MIN);
  const out = await t.m.reconcile();
  assert.equal(out.refundsDone, 1);
  assert.equal(sdk.refundLog.length, 1, 'no second refund');
  assert.equal(sdk.calls.refund, 1);
  assert.equal(t.calls.refunded.length, 1);
});

test('REFUND: Razorpay refund API down => queued with backoff and completed when it recovers', async () => {
  const t = setup({ onPaymentSuccess: async () => { throw new (loadModule(ROOT).mod.CannotFulfil)('gone'); } });
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  const sdk = t.sdk(); const real = sdk.paymentsApi.refund; let down = true;
  sdk.paymentsApi.refund = async (id, p) => { if (down) throw Object.assign(new Error('503'), { statusCode: 503 }); return real(id, p); };
  await t.webhook('payment.captured', cap(PAY_A, rz));
  assert.equal(sdk.refundLog.length, 0);
  assert.equal((await t.store.getRefund(PAY_A)).status, 'failed');
  await t.m.reconcile(); // too early: backing off
  assert.equal(sdk.refundLog.length, 0);
  down = false; t.advance(MIN);
  assert.equal((await t.m.reconcile()).refundsDone, 1);
  assert.equal(sdk.refundLog.length, 1);
  assert.equal((await t.store.getRefund(PAY_A)).status, 'refunded');
  assert.equal(t.calls.refunded.length, 1);
});

test('REFUND: gives up after maxRefundAttempts with a loud alert (refund manually)', async () => {
  const t = setup({ config: { autoRefund: { maxRefundAttempts: 3, refundBackoffMs: [1000] } }, onPaymentSuccess: async () => { throw new (loadModule(ROOT).mod.CannotFulfil)('gone'); } });
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  t.sdk().paymentsApi.refund = async () => { throw Object.assign(new Error('503'), { statusCode: 503 }); };
  await t.webhook('payment.captured', cap(PAY_A, rz));
  for (let i = 0; i < 5; i++) { t.advance(5000); await t.m.reconcile(); }
  assert.equal(t.calls.anomalies.filter((a) => a.type === 'refund_failed_permanently').length, 1);
});

test('REFUND: crash after the decision but before the refund call => reconciler finishes the refund', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A);
  assert.equal(await t.store.markRefunded(rz, { paymentId: PAY_A, nextReconcileAt: new Date(t.clk.t + 60000) }), true); // decision durable, process dies
  assert.equal(t.sdk().refundLog.length, 0);
  t.advance(2 * MIN);
  await t.m.reconcile();
  assert.equal(t.sdk().refundLog.length, 1);
});

test('REFUND: database down while compensating => webhook answers 5xx (Razorpay retries), nothing is lost', async () => {
  const t = setup({ total: 50000 });
  const old = (await t.create()).body.razorpayOrderId;
  t.host.total = 70000; await t.create();
  t.pay(old, PAY_A, 50000);
  const real = t.store.claimRefund.bind(t.store); let down = true;
  t.store.claimRefund = async (a) => { if (down) throw new Error('mongo unavailable'); return real(a); };
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, old, 50000))).statusCode, 500);
  down = false;
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, old, 50000))).statusCode, 200);
  assert.equal(t.sdk().refundLog.length, 1);
});

test('refund.processed from the Razorpay dashboard is passed to onPaymentRefunded', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  await t.webhook('refund.processed', cap(PAY_A, rz, 50000, { amount_refunded: 50000 }), { refund: { entity: { id: 'rfnd_X', amount: 50000 } } });
  assert.equal(t.calls.refunded[0].source, 'webhook');
  assert.equal(t.calls.refunded[0].fullyRefunded, true);
});

// =====================================================================  tampering
test('AMOUNT TAMPERING: Razorpay says a different amount was paid than our order => never fulfilled, refunded', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  t.pay(rz, PAY_A, 100); // Rs 1 against a Rs 500 order
  const v = await t.verify('ORD1', rz, PAY_A);
  assert.equal(v.statusCode, 409);
  assert.equal(t.calls.success.length, 0);
  assert.deepEqual(t.sdk().refundLog, [{ paymentId: PAY_A, amount: 100 }]);
});

test('AMOUNT TAMPERING via forged webhook payload (wrong secret) is rejected outright', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, rz, 1), undefined, 'wrong_secret_wrong_secret')).statusCode, 400);
  assert.equal(t.calls.success.length, 0);
  assert.equal(t.sdk().refundLog.length, 0);
});

test('webhook: bad / missing signature rejected', async () => {
  const t = setup();
  assert.equal((await call(t.m.router, 'POST', '/webhook', { body: Buffer.from('{}'), headers: {} })).statusCode, 400);
});

test('webhook: already-parsed body (mounted after express.json) fails loudly, not silently', async () => {
  const t = setup();
  const r = await call(t.m.router, 'POST', '/webhook', { body: { event: 'payment.captured' }, headers: { 'x-razorpay-signature': 'x' } });
  assert.equal(r.statusCode, 500);
});

test('webhook: unknown order / irrelevant events => 200 so Razorpay stops retrying', async () => {
  const t = setup();
  assert.equal((await t.webhook('payment.captured', cap(PAY_A, 'order_SOMEONEELSE1'))).statusCode, 200);
  const body = Buffer.from(JSON.stringify({ event: 'settlement.processed', payload: {} }));
  assert.equal((await call(t.m.router, 'POST', '/webhook', { body, headers: { 'x-razorpay-signature': sign(WH_SECRET, body) } })).statusCode, 200);
});

test('webhook: late "payment.failed" after a success does NOT trigger onPaymentFailed; a real failed attempt does', async () => {
  const t = setup();
  const rz = (await t.create()).body.razorpayOrderId;
  await t.webhook('payment.failed', { id: PAY_B, order_id: rz, amount: 50000, currency: 'INR', status: 'failed', error_description: 'declined' });
  assert.equal(t.calls.failed.length, 1);
  assert.equal((await t.create()).statusCode, 200); // can still retry and pay
  await t.webhook('payment.captured', cap(PAY_A, rz));
  await t.webhook('payment.failed', { id: 'pay_CCCCCCCCCCCC', order_id: rz, amount: 50000, currency: 'INR', status: 'failed', error_description: 'old' });
  assert.equal(t.calls.failed.length, 1);
});

test('create-order refused once paid / while processing / while a payment is being confirmed (never a 2nd payment)', async () => {
  const t = setup({ onPaymentSuccess: async () => { throw new Error('temporary'); } });
  const rz = (await t.create()).body.razorpayOrderId;
  await t.webhook('payment.captured', cap(PAY_A, rz)); // money taken, fulfilment failing
  const r = await t.create();
  assert.equal(r.statusCode, 409);
  assert.equal(t.sdk().calls.create, 1);
});

test('status endpoint: owner only; unpaid -> processing -> paid / refunded', async () => {
  const t = setup();
  const get = (id) => call(t.m.router, 'GET', '/status/:orderId', { params: { orderId: id } });
  const rz = (await t.create()).body.razorpayOrderId;
  assert.equal((await get('ORD1')).body.status, 'unpaid');
  await t.webhook('payment.captured', cap(PAY_A, rz));
  assert.equal((await get('ORD1')).body.status, 'paid');
  assert.equal((await get('NOPE')).statusCode, 404);
  const r2 = setup({ onPaymentSuccess: async () => { throw new (loadModule(ROOT).mod.CannotFulfil)('x'); } });
  const rz2 = (await r2.create()).body.razorpayOrderId;
  await r2.webhook('payment.captured', cap(PAY_A, rz2));
  assert.equal((await call(r2.m.router, 'GET', '/status/:orderId', { params: { orderId: 'ORD1' } })).body.status, 'refunded');
});

// =====================================================================  platform
test('error handler keeps 4xx codes (413/400) and maps saturation to 503', async () => {
  const t = setup();
  const mk = () => ({ statusCode: 200, headers: {}, set(k, v) { this.headers[k] = v; return this; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } });
  const eh = t.m.router.errorHandlers[0];
  let res = mk(); eh(Object.assign(new Error('too large'), { status: 413 }), {}, res, () => {}); assert.equal(res.statusCode, 413);
  res = mk(); eh(Object.assign(new Error('busy'), { code: 'RZP_BUSY' }), {}, res, () => {}); assert.equal(res.statusCode, 503);
  res = mk(); eh(new Error('secret db stack'), {}, res, () => {}); assert.deepEqual([res.statusCode, res.body], [500, { error: 'Payment service error' }]);
});

test('BACKPRESSURE: Razorpay calls are capped; overflow is rejected fast with 503 instead of melting the server', async () => {
  const t = setup({ config: { maxConcurrent: 2, maxQueue: 3, queueWaitMs: 5000 } });
  await t.create('WARM'); t.sdk().delayMs = 25;
  const rs = await Promise.all(Array.from({ length: 12 }, (_, i) => t.create(`BP${i}`)));
  const codes = rs.map((r) => r.statusCode);
  assert.ok(t.sdk().maxInflight <= 2, `max in flight was ${t.sdk().maxInflight}`);
  assert.equal(codes.filter((c) => c === 200).length, 5); // 2 running + 3 queued
  assert.equal(codes.filter((c) => c === 503).length, 7);
  assert.equal(codes.filter((c) => c !== 200 && c !== 503).length, 0);
});

test('Razorpay API calls time out instead of hanging your server', async () => {
  const t = setup({ config: { apiTimeoutMs: 30 } });
  await t.create('WARM'); t.sdk().delayMs = 500;
  const t0 = Date.now();
  assert.equal((await t.create('SLOW')).statusCode, 500);
  assert.ok(Date.now() - t0 < 400);
});

test('startup safety: memory store refused in production; incomplete store rejected with a clear message', () => {
  const { mod } = loadModule(ROOT);
  const base = { logger: silent, getOrder: async () => null, onPaymentSuccess: async () => {} };
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  assert.throws(() => mod.createRazorpayModule(base), /in-memory store/);
  process.env.NODE_ENV = prev;
  assert.throws(() => mod.createRazorpayModule({ ...base, store: { save() {} } }), /store is missing methods/);
  assert.throws(() => mod.createRazorpayModule({ ...base, config: { keyId: 'rzp_live_abcdefgh123456' } }), /LIVE keys|in-memory/);
});

test('config: trims env whitespace, rejects weak/equal secrets, sane amount rails', () => {
  const { mod } = loadModule(ROOT);
  const base = { logger: silent, store: new mod.MemoryStore(), getOrder: async () => null, onPaymentSuccess: async () => {} };
  assert.equal(mod.createRazorpayModule({ ...base, config: { keySecret: `  ${KEY_SECRET}  ` } }).config.keySecret, KEY_SECRET);
  assert.throws(() => mod.createRazorpayModule({ ...base, config: { webhookSecret: KEY_SECRET } }), /different/);
  assert.throws(() => mod.createRazorpayModule({ ...base, config: { webhookSecret: 'short' } }), /too short/);
  assert.equal(mod.createRazorpayModule({ ...base, config: { minAmount: 1 } }).config.minAmount, 100, 'min can never go below Razorpay Re 1');
});

test('rate limiting: per-user key behind shared IP, separate IP layer', () => {
  limiterCalls.length = 0;
  setup();
  const byLimit = Object.fromEntries(limiterCalls.map((c) => [c.limit, c]));
  assert.ok(byLimit[120] && byLimit[20] && byLimit[60]);
  const key = byLimit[20].keyGenerator;
  assert.equal(key({ user: { id: 'u1' }, ip: '1.1.1.1' }), 'u:u1');
  assert.equal(key({ user: { _id: 'u2' }, ip: '1.1.1.1' }), 'u:u2');
  assert.equal(key({ ip: '1.1.1.1' }), '1.1.1.1');
});

test('LOAD: 2,000 concurrent customers, duplicate webhooks + verify => every order fulfilled exactly once, zero refunds', async () => {
  const fulfilled = new Map();
  const t = setup({
    config: { maxConcurrent: 500, maxQueue: 10000 },
    onPaymentSuccess: async (i) => { fulfilled.set(i.internalOrderId, (fulfilled.get(i.internalOrderId) || 0) + 1); await new Promise((r) => setImmediate(r)); },
  });
  const N = 2000;
  const ids = Array.from({ length: N }, (_, i) => `O${i}`);
  const created = await Promise.all(ids.map((id) => t.create(id)));
  assert.ok(created.every((c) => c.statusCode === 200));
  created.forEach((c, i) => t.pay(c.body.razorpayOrderId, `pay_LOAD${String(i).padStart(8, '0')}`));
  await Promise.all(created.flatMap((c, i) => {
    const pid = `pay_LOAD${String(i).padStart(8, '0')}`;
    return [t.verify(ids[i], c.body.razorpayOrderId, pid), t.webhook('payment.captured', cap(pid, c.body.razorpayOrderId)), t.webhook('order.paid', cap(pid, c.body.razorpayOrderId))];
  }));
  assert.equal(fulfilled.size, N);
  assert.ok([...fulfilled.values()].every((n) => n === 1));
  assert.equal(t.sdk().refundLog.length, 0);
});
