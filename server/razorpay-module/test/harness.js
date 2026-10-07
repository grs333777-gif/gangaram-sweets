'use strict';
/**
 * Dependency-free test harness. Stubs `express`, `express-rate-limit` and the `razorpay` SDK so the REAL
 * module code (index.js / service.js / stores) can be exercised with `node test/run.js` without npm install
 * and without touching Razorpay. It is NOT a replacement for one end-to-end test with rzp_test_ keys.
 */
const Module = require('module');
const crypto = require('crypto');

// ---------- fake express ----------
function makeRouter() {
  const routes = []; const errorHandlers = []; const mws = [];
  return {
    routes, errorHandlers,
    use(fn) { (fn.length === 4 ? errorHandlers : mws).push(fn); },
    post(path, ...h) { routes.push({ method: 'POST', path, handlers: [...mws, ...h] }); },
    get(path, ...h) { routes.push({ method: 'GET', path, handlers: [...mws, ...h] }); },
  };
}
const passthrough = (kind, opts) => Object.assign((req, res, next) => next(), { kind, opts });
const fakeExpress = () => ({ Router: makeRouter, json: (o) => passthrough('json', o), raw: (o) => passthrough('raw', o) });

const limiterCalls = [];
const fakeRateLimit = (o) => { limiterCalls.push(o); return passthrough('limiter', o); };

// ---------- fake Razorpay SDK (programmable, behaves like the real API where it matters) ----------
class FakeRazorpaySDK {
  constructor() {
    FakeRazorpaySDK.last = this;
    this.calls = { create: 0, fetch: 0, capture: 0, fetchPayments: 0, refund: 0 };
    this.paymentStore = {};   // paymentId -> payment entity (tests set these)
    this.orderPayments = {};  // optional override: orderId -> [payments]
    this.refundLog = [];      // every refund that Razorpay ACCEPTED: { paymentId, amount }
    this.delayMs = 0;
    this.seq = 0;
    this.inflight = 0;
    this.maxInflight = 0;
    const d = async (v) => {
      this.inflight += 1; this.maxInflight = Math.max(this.maxInflight, this.inflight);
      try { await new Promise((r) => setTimeout(r, this.delayMs)); return typeof v === 'function' ? v() : v; } finally { this.inflight -= 1; }
    };
    const apiErr = (statusCode, description) => Object.assign(new Error(description), { statusCode, error: { code: 'BAD_REQUEST_ERROR', description } });
    this.apiErr = apiErr;
    this.orders = {
      create: async (p) => {
        this.calls.create += 1;
        return d(() => { this.seq += 1; return { id: `order_TEST${String(this.seq).padStart(10, '0')}`, amount: p.amount, currency: p.currency, receipt: p.receipt }; });
      },
      fetchPayments: async (id) => {
        this.calls.fetchPayments += 1;
        return d(() => ({ items: (this.orderPayments[id] || Object.values(this.paymentStore).filter((x) => x.order_id === id)).map((x) => ({ ...x })) }));
      },
    };
    this.paymentsApi = {
      fetch: async (id) => {
        this.calls.fetch += 1;
        return d(() => { if (!this.paymentStore[id]) throw apiErr(400, 'payment not found'); return { amount_refunded: 0, ...this.paymentStore[id] }; });
      },
      capture: async (id) => {
        this.calls.capture += 1;
        return d(() => { this.paymentStore[id].status = 'captured'; return { ...this.paymentStore[id] }; });
      },
      // Like the real API: refusing to refund more than what is left is what protects you from double refunds
      refund: async (id, payload = {}) => {
        this.calls.refund += 1;
        return d(() => {
          const p = this.paymentStore[id];
          if (!p) throw apiErr(400, 'payment not found');
          if (p.status !== 'captured') throw apiErr(400, 'payment is not captured');
          const remaining = p.amount - (p.amount_refunded || 0);
          const amt = payload.amount === undefined ? remaining : payload.amount;
          if (amt > remaining || amt <= 0) throw apiErr(400, 'refund amount exceeds the captured amount that is left');
          p.amount_refunded = (p.amount_refunded || 0) + amt;
          if (p.amount_refunded >= p.amount) p.status = 'refunded';
          this.refundLog.push({ paymentId: id, amount: amt });
          return { id: `rfnd_${this.refundLog.length}`, payment_id: id, amount: amt };
        });
      },
    };
  }
}
function sdkClass() {
  const shared = new FakeRazorpaySDK(); // every server instance talks to the SAME Razorpay, like in real life
  return class Razorpay {
    constructor() {
      Razorpay.sdk = shared;
      this.orders = shared.orders;
      this.payments = shared.paymentsApi;
    }
  };
}

function loadModule(dir, { NODE_ENV } = {}) {
  const origLoad = Module._load;
  const RazorpayStub = sdkClass();
  Module._load = function (request, parent, isMain) {
    if (request === 'express') return fakeExpress();
    if (request === 'express-rate-limit') return fakeRateLimit;
    if (request === 'razorpay') return RazorpayStub;
    return origLoad.call(this, request, parent, isMain);
  };
  for (const k of Object.keys(require.cache)) if (k.startsWith(dir)) delete require.cache[k];
  const env = process.env.NODE_ENV;
  if (NODE_ENV !== undefined) process.env.NODE_ENV = NODE_ENV;
  try { return { mod: require(dir), RazorpayStub }; } finally { Module._load = origLoad; process.env.NODE_ENV = env; }
}

// ---------- route runner ----------
async function call(router, method, path, req = {}) {
  const route = router.routes.find((r) => r.method === method && r.path === path);
  if (!route) throw new Error(`no route ${method} ${path}`);
  const res = { statusCode: 200, headers: {}, body: undefined, done: false };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; res.done = true; return res; };
  res.set = (k, v) => { res.headers[k] = v; return res; };
  req.get = (h) => (req.headers || {})[h.toLowerCase()];
  req.headers = req.headers || {};
  const runErr = async (err) => { for (const h of router.errorHandlers) { await h(err, req, res, () => {}); if (res.done) return; } };
  try {
    for (const h of route.handlers) {
      let advanced = false;
      let nextErr;
      await new Promise((resolve) => {
        const r = h(req, res, (e) => { advanced = true; nextErr = e; resolve(); });
        Promise.resolve(r).then(() => { if (!advanced) resolve(); });
      });
      if (nextErr) { await runErr(nextErr); break; }
      if (res.done) break;
    }
  } catch (e) { await runErr(e); }
  return res;
}

const sign = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

module.exports = { loadModule, call, sign, limiterCalls, FakeRazorpaySDK };
