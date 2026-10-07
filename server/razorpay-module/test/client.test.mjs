// node --test test/client.test.mjs  -- exercises client/razorpay-checkout.js with a fake browser
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

const src = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../client/razorpay-checkout.js');
const tmp = path.join(os.tmpdir(), `rzp-client-${Date.now()}.mjs`);
fs.copyFileSync(src, tmp);

// collapse waits so the ~30s retry schedule runs instantly
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, ms > 100 ? 0 : ms, ...a);

let popup; let fetchPlan = [];
const fetchLog = [];
globalThis.window = globalThis;
globalThis.document = { head: { appendChild() {} } };
globalThis.Razorpay = class { constructor(o) { this.o = o; this.handlers = {}; popup = this; } on(e, f) { this.handlers[e] = f; } open() {} };
globalThis.fetch = async (u, init) => {
  fetchLog.push(u);
  const next = fetchPlan.shift();
  if (next === 'network') throw new TypeError('Failed to fetch');
  const { status, body } = next;
  return { status, ok: status >= 200 && status < 300, json: async () => body };
};
const order = { status: 200, body: { keyId: 'rzp_test_x', razorpayOrderId: 'order_X', amount: 50000, currency: 'INR', businessName: 'Gangaram' } };
const resp = { razorpay_order_id: 'order_X', razorpay_payment_id: 'pay_X', razorpay_signature: 's' };
const { pay, waitForPaid, newIdempotencyKey } = await import(url.pathToFileURL(tmp).href);
const flush = () => new Promise((r) => realSetTimeout(r, 20));

test('uses the Gangaram navy theme, confirm_close, and only ever sends the order id', async () => {
  fetchLog.length = 0; fetchPlan = [order];
  pay({ orderId: 'O1' }); await flush();
  assert.equal(popup.o.theme.color, '#2A3F87');
  assert.equal(popup.o.modal.confirm_close, true);
  assert.equal(popup.o.amount, 50000); // came from the server
  popup.o.modal.ondismiss(); await flush();
});

test('network drops after payment are retried until verify succeeds (customer is never told "failed")', async () => {
  fetchPlan = [order, 'network', 'network', { status: 502, body: {} }, { status: 200, body: { status: 'paid' } }];
  const out = []; 
  const p = pay({ orderId: 'O2', onSuccess: (r) => out.push(['success', r.status]), onFailure: (e) => out.push(['fail', e.message]) });
  await flush(); popup.o.handler(resp); const res = await p;
  assert.deepEqual(out, [['success', 'paid']]); assert.equal(res.status, 'paid');
});

test('server keeps answering 202 => onPending (not an error)', async () => {
  fetchPlan = [order, ...Array(6).fill({ status: 202, body: { status: 'pending' } })];
  const out = [];
  const p = pay({ orderId: 'O3', onPending: () => out.push('pending'), onFailure: () => out.push('fail') });
  await flush(); popup.o.handler(resp); await p;
  assert.deepEqual(out, ['pending']);
});

test('definite 4xx from verify => onFailure with the server message', async () => {
  fetchPlan = [order, { status: 402, body: { error: 'Payment failed' } }];
  const out = [];
  const p = pay({ orderId: 'O4', onFailure: (e) => out.push(e.message), onSuccess: () => out.push('ok') });
  await flush(); popup.o.handler(resp); await p;
  assert.deepEqual(out, ['Payment failed']);
});

test('popup "dismiss" firing after a successful payment does not cancel verification', async () => {
  fetchPlan = [order, { status: 200, body: { status: 'paid' } }];
  const out = [];
  const p = pay({ orderId: 'O5', onSuccess: () => out.push('success'), onDismiss: () => out.push('dismissed') });
  await flush(); popup.o.handler(resp); popup.o.modal.ondismiss(); await p;
  assert.deepEqual(out, ['success']);
});

test('a failed attempt does not end the flow (customer can retry in the popup), then success', async () => {
  fetchPlan = [order, { status: 200, body: { status: 'paid' } }];
  const out = [];
  const p = pay({ orderId: 'O6', onAttemptFailed: (e) => out.push('attempt:' + e.message), onSuccess: () => out.push('success') });
  await flush();
  popup.handlers['payment.failed']({ error: { description: 'Bank declined' } });
  popup.o.handler(resp); await p;
  assert.deepEqual(out, ['attempt:Bank declined', 'success']);
});

test('double-click: second pay() while one is open is ignored', async () => {
  fetchPlan = [order];
  const first = pay({ orderId: 'O7' }); await flush();
  const second = await pay({ orderId: 'O7' });
  assert.equal(second.status, 'busy');
  popup.o.modal.ondismiss(); await first;
});

test('create-order error (e.g. 409 already paid) surfaces to onFailure and unlocks the button', async () => {
  fetchPlan = [{ status: 409, body: { error: 'Order already paid' } }];
  const out = [];
  await pay({ orderId: 'O8', onFailure: (e) => out.push(e.message) });
  assert.deepEqual(out, ['Order already paid']);
  fetchPlan = [order]; const again = pay({ orderId: 'O9' }); await flush();
  assert.ok(popup); popup.o.modal.ondismiss(); await again;
});

test('create-order 503 (server busy) and network drops are retried automatically, then the popup opens', async () => {
  fetchPlan = [{ status: 503, body: { error: 'busy' } }, 'network', { status: 429, body: {} }, order];
  popup = null;
  const p = pay({ orderId: 'R1' }); await flush(); await flush();
  assert.ok(popup, 'popup must open after the retries');
  popup.o.modal.ondismiss(); await p;
});

test('create-order gives up after repeated 503 and shows the server message', async () => {
  fetchPlan = Array(4).fill({ status: 503, body: { error: 'Payment service is busy, please retry' } });
  const out = [];
  await pay({ orderId: 'R2', onFailure: (e) => out.push(e.message) });
  assert.deepEqual(out, ['Payment service is busy, please retry']);
});

test('create-order 409 / 422 / 404 are definite answers: NOT retried', async () => {
  for (const status of [409, 422, 404]) {
    fetchLog.length = 0; fetchPlan = [{ status, body: { error: 'nope' } }];
    await pay({ orderId: 'R3' });
    assert.equal(fetchLog.length, 1, `status ${status} must not be retried`);
  }
});

test('verify 409 "refunded automatically" is shown to the customer as a failure with the server message', async () => {
  fetchPlan = [order, { status: 409, body: { error: 'Your payment could not be applied to this order. It is being refunded automatically.' } }];
  const out = [];
  const p = pay({ orderId: 'R4', onFailure: (e) => out.push(e.message) });
  await flush(); popup.o.handler(resp); await p;
  assert.match(out[0], /refunded automatically/);
});

test('waitForPaid polls /status until paid, ignoring network blips', async () => {
  fetchPlan = [{ status: 200, body: { status: 'processing' } }, 'network', { status: 200, body: { status: 'paid' } }];
  const r = await waitForPaid('W1', { intervalMs: 1 });
  assert.equal(r.status, 'paid');
});

test('waitForPaid reports "refunded" so the UI can say so', async () => {
  fetchPlan = [{ status: 200, body: { status: 'refunded' } }];
  assert.equal((await waitForPaid('W2', { intervalMs: 1 })).status, 'refunded');
});

test('newIdempotencyKey: unique, URL/header-safe, 8-128 chars', () => {
  const keys = new Set(Array.from({ length: 1000 }, () => newIdempotencyKey()));
  assert.equal(keys.size, 1000);
  for (const k of keys) assert.match(k, /^[A-Za-z0-9_-]{8,128}$/);
});
