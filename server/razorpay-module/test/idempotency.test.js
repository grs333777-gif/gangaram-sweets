'use strict';
/** node --test test/idempotency.test.js : the Idempotency-Key middleware for order placement (double-click / retry safety). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createIdempotency } = require('../helpers/idempotency');
const { fakeMongoose } = require('./fake-mongoose');

function setup(opts = {}) {
  const clk = { t: Date.parse('2026-01-01T00:00:00Z') };
  const idem = createIdempotency(fakeMongoose({ clock: () => clk.t }), { clock: () => clk.t, ...opts });
  const run = async (mw, req, handler) => {
    const res = { statusCode: 200, headers: {}, body: undefined, sent: false };
    res.status = (c) => { res.statusCode = c; return res; };
    res.set = (k, v) => { res.headers[k] = v; return res; };
    res.json = (b) => { res.body = b; res.sent = true; return res; };
    const r = { method: 'POST', baseUrl: '/api', path: '/orders', ip: '1.1.1.1', user: { id: 'u1' }, body: { items: [1] }, headers: {}, ...req };
    r.get = (h) => r.headers[h.toLowerCase()];
    await new Promise((resolve) => {
      const origJson = res.json;
      res.json = (b) => { origJson(b); resolve(); return res; };
      mw(r, res, async (err) => { if (err) { res.statusCode = 500; res.body = { error: 'x' }; resolve(); return; } try { await handler(r, res); } catch (e) { res.status(500).json({ error: 'boom' }); } });
    });
    return res;
  };
  return { clk, idem, run };
}
const KEY = 'a1b2c3d4-e5f6-7890';

test('first request runs; repeat returns the SAME stored response and does not run the handler again', async () => {
  const { idem, run } = setup(); let runs = 0;
  const h = async (req, res) => { runs += 1; res.status(201).json({ orderId: `ORD${runs}` }); };
  const mw = idem();
  const a = await run(mw, { headers: { 'idempotency-key': KEY } }, h);
  const b = await run(mw, { headers: { 'idempotency-key': KEY } }, h);
  assert.equal(runs, 1);
  assert.deepEqual([a.statusCode, a.body], [201, { orderId: 'ORD1' }]);
  assert.deepEqual([b.statusCode, b.body], [201, { orderId: 'ORD1' }]);
  assert.equal(b.headers['Idempotent-Replayed'], 'true');
});

test('DOUBLE-CLICK: 10 simultaneous identical requests => handler runs exactly once, everyone gets the order or a "retry" 409', async () => {
  const { idem, run } = setup(); let runs = 0;
  const h = async (req, res) => { runs += 1; await new Promise((r) => setTimeout(r, 20)); res.status(201).json({ orderId: 'ORD1' }); };
  const mw = idem();
  const rs = await Promise.all(Array.from({ length: 10 }, () => run(mw, { headers: { 'idempotency-key': KEY } }, h)));
  assert.equal(runs, 1);
  for (const r of rs) assert.ok((r.statusCode === 201 && r.body.orderId === 'ORD1') || r.statusCode === 409, `got ${r.statusCode}`);
  assert.equal(rs.filter((r) => r.statusCode === 201).length >= 1, true);
  const after = await run(mw, { headers: { 'idempotency-key': KEY } }, h); // client retried the 409s
  assert.deepEqual([after.statusCode, after.body.orderId], [201, 'ORD1']);
  assert.equal(runs, 1);
});

test('missing / malformed key => 400 (when required)', async () => {
  const { idem, run } = setup();
  const h = async () => { throw new Error('must not run'); };
  assert.equal((await run(idem(), { headers: {} }, h)).statusCode, 400);
  for (const k of ['short', 'has space in it!!', 'x'.repeat(200), '../../etc/passwd']) assert.equal((await run(idem(), { headers: { 'idempotency-key': k } }, h)).statusCode, 400);
});

test('same key with a DIFFERENT body => 422 (never silently reused for another cart)', async () => {
  const { idem, run } = setup();
  const h = async (req, res) => res.status(201).json({ ok: 1 });
  await run(idem(), { headers: { 'idempotency-key': KEY }, body: { items: [1] } }, h);
  const r = await run(idem(), { headers: { 'idempotency-key': KEY }, body: { items: [1, 2] } }, h);
  assert.equal(r.statusCode, 422);
});

test('keys are scoped per user: one user cannot replay or collide with another user\'s key', async () => {
  const { idem, run } = setup(); let runs = 0;
  const h = async (req, res) => { runs += 1; res.status(201).json({ for: req.user.id }); };
  const mw = idem();
  const a = await run(mw, { headers: { 'idempotency-key': KEY }, user: { id: 'alice' } }, h);
  const b = await run(mw, { headers: { 'idempotency-key': KEY }, user: { id: 'bob' } }, h);
  assert.equal(runs, 2);
  assert.equal(a.body.for, 'alice'); assert.equal(b.body.for, 'bob');
});

test('a failed request (5xx) releases the key so the retry can succeed', async () => {
  const { idem, run } = setup(); let n = 0;
  const h = async (req, res) => { n += 1; if (n === 1) return res.status(500).json({ error: 'db down' }); return res.status(201).json({ orderId: 'ORD1' }); };
  const mw = idem();
  assert.equal((await run(mw, { headers: { 'idempotency-key': KEY } }, h)).statusCode, 500);
  const retry = await run(mw, { headers: { 'idempotency-key': KEY } }, h);
  assert.deepEqual([retry.statusCode, retry.body.orderId, n], [201, 'ORD1', 2]);
});

test('a server that died mid-request: after the lock expires exactly one retry takes over', async () => {
  const { idem, run, clk } = setup({ lockMs: 30000 }); let runs = 0;
  const mw = idem();
  // simulate the crash: the key was created (in progress) but the handler never answered
  const hang = new Promise(() => {});
  run(mw, { headers: { 'idempotency-key': KEY } }, async () => { runs += 1; await hang; });
  await new Promise((r) => setTimeout(r, 30));
  const early = await run(mw, { headers: { 'idempotency-key': KEY } }, async () => { runs += 1; });
  assert.equal(early.statusCode, 409); // still locked
  clk.t += 31000;
  const h = async (req, res) => { runs += 1; res.status(201).json({ orderId: 'ORD1' }); };
  const rs = await Promise.all([run(mw, { headers: { 'idempotency-key': KEY } }, h), run(mw, { headers: { 'idempotency-key': KEY } }, h)]);
  assert.equal(rs.filter((r) => r.statusCode === 201).length >= 1, true);
  assert.equal(runs, 2, 'original attempt + exactly ONE takeover');
});

test('optional mode: no header => passes straight through', async () => {
  const { idem, run } = setup(); let runs = 0;
  const r = await run(idem({ required: false }), { headers: {} }, async (req, res) => { runs += 1; res.status(200).json({ ok: true }); });
  assert.equal(r.statusCode, 200); assert.equal(runs, 1);
});
