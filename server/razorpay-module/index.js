'use strict';

const express = require('express');
const erl = require('express-rate-limit');
const { loadConfig } = require('./config');
const { createService } = require('./service');
const { CannotFulfil, isCannotFulfil } = require('./errors');
const { MemoryStore } = require('./stores/memory-store');
const { createMongoStore } = require('./stores/mongo-store');
const { createIdempotency } = require('./helpers/idempotency');
const { priceOrder, PricingError } = require('./helpers/price-order');

// Works with express-rate-limit v7 and v8
const rateLimit = typeof erl === 'function' ? erl : erl.rateLimit;
const ipKey = erl.ipKeyGenerator || ((ip) => ip);

const isId = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 100) || Number.isSafeInteger(v);
const isRzpId = (v, prefix) => typeof v === 'string' && new RegExp(`^${prefix}_[A-Za-z0-9]{8,30}$`).test(v);
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const REQUIRED_STORE_METHODS = [
  'save', 'getByInternalOrderId', 'getByRazorpayOrderId', 'retire', 'claim', 'complete', 'release', 'markRefunded', 'markFailed',
  'listPending', 'claimReconcile', 'rescheduleReconcile',
  'claimRefund', 'completeRefund', 'failRefund', 'listPendingRefunds',
];

/**
 * createRazorpayModule({
 *   getOrder(orderId, req)  -> { amount: <paise integer>, alreadyPaid?: boolean, customer?: {...} } | null
 *        Look the order up in YOUR database and verify req.user owns it.
 *        The amount MUST be computed server-side. Never take it from the browser.
 *   onPaymentSuccess(info)  -> mark the order paid, send confirmation, reduce stock, etc. MUST be idempotent.
 *        Throw CannotFulfil (exported) if the order can NEVER be fulfilled (cancelled, out of stock, total changed):
 *        the customer is then refunded automatically. Any other error = temporary, retried.
 *   checkOrder(orderId)     -> optional but recommended. { amount, cancelled? } | null, no `req` available (webhook context).
 *        Re-checks the order right before fulfilment; mismatch => auto-refund instead of fulfilling.
 *   onPaymentFailed(info)   -> optional. A failed ATTEMPT only: the customer can still retry and pay.
 *   onPaymentRefunded(info) -> optional. A payment was refunded (auto or from the Razorpay dashboard): cancel the order, tell the customer.
 *   onPaymentAnomaly(info)  -> optional. Something unusual happened and was handled/needs eyes (alerts).
 *   authenticate            -> Express middleware (your login check). Strongly recommended.
 *   store                   -> persistence adapter: createMongoStore(mongoose) or your own (REQUIRED in production)
 *   rateLimit               -> { ipPerMinute: 120, userPerMinute: 20, statusPerMinute: 60 }
 *   rateLimitStore          -> (name) => new RedisStore({ prefix: `rl:rzp:${name}:`, ... })  (needed for multi-server)
 *   metrics                 -> optional { inc(name) } (Prometheus/StatsD adapter)
 *   config                  -> optional overrides (see config.js), otherwise read from process.env
 * }) => { router, service, config, reconcile, startReconciler }
 */
function createRazorpayModule(opts = {}) {
  const {
    getOrder, checkOrder, onPaymentSuccess, onPaymentFailed, onPaymentRefunded, onPaymentAnomaly, authenticate, logger = console, metrics,
  } = opts;
  if (typeof getOrder !== 'function') throw new Error('[razorpay] `getOrder` is required');
  if (typeof onPaymentSuccess !== 'function') throw new Error('[razorpay] `onPaymentSuccess` is required');

  const config = loadConfig(opts.config);
  const now = opts.clock || Date.now;
  const at = (ms) => new Date(now() + ms);
  const service = opts.service || createService(config);
  const store = opts.store || new MemoryStore({ clock: opts.clock });
  const auth = authenticate || ((req, res, next) => next());
  const { autoRefund, reconcile: rc } = config;
  const metric = (name) => { try { if (metrics && metrics.inc) metrics.inc(name); } catch (_) { /* never let metrics break payments */ } };

  if (!opts.store && (config.isLive || process.env.NODE_ENV === 'production')) {
    throw new Error('[razorpay] Refusing to run in production / with LIVE keys using the in-memory store. Provide a real `store` (createMongoStore(mongoose)).');
  }
  const missingMethods = REQUIRED_STORE_METHODS.filter((m) => typeof store[m] !== 'function');
  if (missingMethods.length) {
    throw new Error(`[razorpay] store is missing methods: ${missingMethods.join(', ')} (see stores/mongo-store.js)`);
  }
  if (process.env.NODE_ENV === 'production' && !config.isLive) {
    logger.warn('[razorpay] NODE_ENV=production but using rzp_test_ keys. Real payments will NOT work.');
  }

  // ---------- rate limiting ----------
  const rl = { ipPerMinute: 120, userPerMinute: 20, statusPerMinute: 60, ...(opts.rateLimit || {}) };
  const userKey = (req) => {
    const u = req.user;
    const id = u && (u.id || u._id);
    return id ? `u:${String(id)}` : ipKey(req.ip || '');
  };
  const limiter = (name, limit, keyGenerator) => rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again shortly' },
    ...(keyGenerator ? { keyGenerator } : {}),
    ...(opts.rateLimitStore ? { store: opts.rateLimitStore(name) } : {}),
  });
  // Two layers: a generous per-IP limit BEFORE auth (many real customers share one mobile-carrier IP),
  // and a strict per-user limit AFTER auth.
  const ipLimiter = limiter('ip', rl.ipPerMinute);
  const userLimiter = limiter('user', rl.userPerMinute, userKey);
  const statusLimiter = limiter('status', rl.statusPerMinute, userKey);

  const json = express.json({ limit: '10kb' });
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  // ======================================================================
  // helpers
  // ======================================================================
  async function anomaly(type, rec, payment, extra = {}) {
    metric('razorpay.anomaly');
    const info = {
      type,
      internalOrderId: rec && rec.internalOrderId,
      razorpayOrderId: rec && rec.razorpayOrderId,
      paymentId: payment && payment.id,
      amount: payment && payment.amount,
      ...extra,
    };
    logger.error('[razorpay] ANOMALY', info);
    if (onPaymentAnomaly) {
      try { await onPaymentAnomaly(info); } catch (e) { logger.error('[razorpay] onPaymentAnomaly threw', e); }
    }
  }

  /** If the account uses manual capture, capture an 'authorized' payment. Returns the up-to-date payment. */
  async function ensureCaptured(payment, rec) {
    if (payment.status !== 'authorized') return payment;
    return service.capturePayment(payment.id, rec.amount, rec.currency);
  }

  /** Two concurrent calls for the same key share one execution (stops double-click => two Razorpay orders). */
  const inflight = new Map();
  function singleFlight(key, fn) {
    if (inflight.has(key)) return inflight.get(key);
    const p = Promise.resolve().then(fn).finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  }

  // ======================================================================
  // compensation: money was taken but the order will not be fulfilled => give it back, exactly once
  // ======================================================================
  const refundBackoff = (attempts) => {
    const steps = autoRefund.refundBackoffMs;
    return steps[Math.min(attempts - 1, steps.length - 1)];
  };

  /**
   * Durable + idempotent: one refund row per payment id (unique), claimed with a lease, and Razorpay's own
   * `amount_refunded` is checked first, so a retry after a lost response can never refund twice.
   * Never throws for Razorpay problems (they're queued for retry). Throws only if the DB itself is down,
   * which makes the webhook answer 5xx so Razorpay retries.
   */
  async function executeRefund({ payment, rec, reason }) {
    const intent = await store.claimRefund({
      paymentId: payment.id, razorpayOrderId: rec.razorpayOrderId, internalOrderId: rec.internalOrderId,
      amount: payment.amount, reason, leaseMs: autoRefund.refundLeaseMs,
    });
    if (!intent) return 'skipped'; // already refunded, or another worker is on it, or backing off
    metric('razorpay.refund.started');
    try {
      const live = await service.fetchPayment(payment.id);
      const already = live.amount_refunded || 0;
      let refundId = null;
      let note;
      let issued = 0;
      if (live.status === 'refunded' || already >= live.amount) {
        note = 'already refunded';
      } else if (live.status === 'failed') {
        note = 'payment failed, nothing to refund';
      } else if (live.status !== 'captured') {
        throw new Error(`payment is '${live.status}', cannot refund yet`); // e.g. authorized/created: retried later
      } else {
        const r = await service.refund(payment.id, {
          amount: live.amount - already,
          notes: { reason, internalOrderId: String(rec.internalOrderId) },
          receipt: `rf_${payment.id}`,
          speed: 'optimum',
        });
        refundId = r && r.id;
        issued = live.amount - already;
      }
      // Tell the host BEFORE marking the refund complete: if your hook throws, the refund job is retried (at-least-once),
      // and the retry sees Razorpay's amount_refunded, so the money is never refunded twice but your order is always told.
      if (onPaymentRefunded && !note?.startsWith('payment failed')) {
        await onPaymentRefunded({
          internalOrderId: rec.internalOrderId, razorpayOrderId: rec.razorpayOrderId, paymentId: payment.id,
          refundId, amount: already + issued, reason, source: 'auto',
        });
      }
      await store.completeRefund(payment.id, { refundId, note });
      metric('razorpay.refund.completed');
      return 'refunded';
    } catch (err) {
      const gaveUp = intent.attempts >= autoRefund.maxRefundAttempts;
      await store.failRefund(payment.id, {
        error: String(err && err.message).slice(0, 300),
        nextRetryAt: gaveUp ? null : at(refundBackoff(intent.attempts)),
      });
      logger.error('[razorpay] refund attempt failed', { paymentId: payment.id, attempts: intent.attempts, err: err && err.error ? err.error : err });
      if (gaveUp) await anomaly('refund_failed_permanently', rec, payment, { reason, action: 'CHECK_RAZORPAY_REFUND_AND_ORDER_STATE_MANUALLY' });
      return 'failed';
    }
  }

  async function compensate(payment, rec, reason, extra = {}) {
    await anomaly(reason, rec, payment, { action: autoRefund.enabled ? 'auto_refund' : 'manual_refund_required', ...extra });
    if (!autoRefund.enabled) return 'manual';
    return executeRefund({ payment, rec, reason });
  }

  /**
   * Decision gate. Atomically declares "this payment will NOT fulfil this order" (only possible while the order is
   * not paid), THEN refunds. Because the decision is a compare-and-set, a payment can never be both fulfilled and refunded.
   * A crash between decision and refund is recovered by the reconciler (it sees status 'refunded' and finishes the refund).
   */
  async function rejectPayment(rec, payment, reason, extra = {}, token) {
    const decided = await store.markRefunded(rec.razorpayOrderId, { token, paymentId: payment.id, nextReconcileAt: at(60 * 1000) });
    if (decided) { await compensate(payment, rec, reason, extra); return true; }
    const cur = await store.getByRazorpayOrderId(rec.razorpayOrderId);
    if (cur && cur.paymentId && cur.paymentId !== payment.id) { // order is bound to a different payment: this one is surplus
      await compensate(payment, cur, 'duplicate_payment', extra);
      return true;
    }
    return false;
  }

  async function maybeRefundStuck(rec, payment) {
    if (!autoRefund.enabled) return false;
    const cur = await store.getByRazorpayOrderId(rec.razorpayOrderId);
    if (!cur || cur.status !== 'created') return false;
    const longEnough = cur.firstClaimAt && now() - +new Date(cur.firstClaimAt) >= autoRefund.stuckAfterMs;
    if ((cur.fulfilAttempts || 0) < autoRefund.stuckAfterAttempts || !longEnough) return false;
    return rejectPayment(cur, payment, 'fulfilment_stuck', { attempts: cur.fulfilAttempts, lastError: cur.lastError });
  }

  // ======================================================================
  // fulfilment: safe to call from /verify, the webhook AND the reconciler, concurrently, on any server, any number of times
  // Returns: 'done' | 'already' | 'busy' | 'duplicate' | 'refunded'
  // ======================================================================
  async function finalize(rec, payment, source) {
    const id = rec.razorpayOrderId;
    const duplicate = async (r) => { await compensate(payment, r, 'duplicate_payment'); return 'duplicate'; };

    if (rec.status === 'superseded') { await compensate(payment, rec, 'paid_superseded_order'); return 'refunded'; }
    if (rec.status === 'paid') return rec.paymentId === payment.id ? 'already' : duplicate(rec);
    if (rec.status === 'refunded') return rec.paymentId === payment.id ? 'refunded' : duplicate(rec);

    // Re-check the order right before fulfilling (it may have been cancelled / re-priced since checkout started).
    if (checkOrder) {
      const snap = await checkOrder(rec.internalOrderId);
      if (!snap || snap.cancelled || snap.amount !== rec.amount) {
        if (await rejectPayment(rec, payment, 'order_changed_or_cancelled', { expected: snap && snap.amount })) return 'refunded';
      }
    }

    const token = await store.claim(id, { paymentId: payment.id, method: payment.method, leaseMs: config.leaseMs });
    if (!token) {
      const cur = await store.getByRazorpayOrderId(id);
      if (!cur) return 'busy';
      if (cur.paymentId && cur.paymentId !== payment.id) return duplicate(cur); // surplus payment => refund it
      if (cur.status === 'paid') return 'already';
      if (cur.status === 'refunded') return 'refunded';
      if (cur.status === 'superseded') { await compensate(payment, cur, 'paid_superseded_order'); return 'refunded'; }
      return 'busy'; // someone else is mid-fulfilment
    }

    try {
      await onPaymentSuccess({
        internalOrderId: rec.internalOrderId,
        razorpayOrderId: id,
        paymentId: payment.id,
        amount: rec.amount,
        currency: rec.currency,
        method: payment.method,
        source, // 'verify' | 'webhook' | 'reconcile'
      });
    } catch (err) {
      if (isCannotFulfil(err)) { // permanent: refund instead of retrying forever
        if (await rejectPayment(rec, payment, 'cannot_fulfil', { detail: String(err.message).slice(0, 300) }, token)) return 'refunded';
        return 'busy'; // lost the fence: another worker owns this payment now
      }
      // temporary: release so the next webhook retry / reconciler pass runs it again (money is already taken!)
      await store.release(id, token, { error: String(err && err.message).slice(0, 300), nextReconcileAt: at(rc.paidStepsMs[0]) });
      if (await maybeRefundStuck(rec, payment)) return 'refunded';
      throw err;
    }
    await store.complete(id, token, { nextReconcileAt: rc.duplicateCheckMs > 0 ? at(rc.duplicateCheckMs) : null });
    metric('razorpay.fulfilled');
    return 'done';
  }

  // ======================================================================
  // 1) create (or reuse) a Razorpay order for one of YOUR orders
  // ======================================================================
  router.post('/create-order', ipLimiter, auth, userLimiter, json, wrap(async (req, res) => {
    const internalOrderId = req.body && req.body.orderId;
    if (!isId(internalOrderId)) return res.status(400).json({ error: 'Invalid orderId' });

    const order = await getOrder(internalOrderId, req);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.alreadyPaid) return res.status(409).json({ error: 'Order already paid' });
    if (!Number.isInteger(order.amount)) {
      logger.error('[razorpay] getOrder returned a non-integer amount (must be integer paise)');
      return res.status(500).json({ error: 'Could not start payment' });
    }
    // Hard rails: nobody can be charged zero / below the minimum / above the ceiling, whatever the order says.
    if (order.amount < config.minAmount) return res.status(422).json({ error: 'Order total is too low for online payment' });
    if (order.amount > config.maxAmount) return res.status(422).json({ error: 'Order total exceeds the online payment limit' });

    const result = await singleFlight(`create:${internalOrderId}`, async () => {
      let rec = await store.getByInternalOrderId(internalOrderId);
      if (rec && rec.status === 'paid') return { conflict: 'Order already paid' };
      // money already taken (being fulfilled / fulfilment retrying): NEVER open a second payment
      if (rec && (rec.status === 'processing' || (rec.status === 'created' && rec.paymentId))) {
        return { conflict: 'Your payment is being confirmed. Please wait a moment.' };
      }
      if (rec && (rec.status === 'refunded' || rec.amount !== order.amount)) {
        await store.retire(internalOrderId, { nextReconcileAt: at(rc.firstCheckMs) }); // retire; a late payment on it is still caught + refunded
        rec = null;
      }
      if (!rec) {
        const rzpOrder = await service.createOrder({
          amount: order.amount,
          receipt: String(internalOrderId),
          notes: { internalOrderId: String(internalOrderId) },
        });
        if (rzpOrder.amount !== order.amount || rzpOrder.currency !== config.currency) {
          throw new Error('[razorpay] Razorpay order amount/currency does not match what was requested');
        }
        rec = await store.save({
          internalOrderId,
          razorpayOrderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          nextReconcileAt: at(rc.firstCheckMs),
        });
      }
      return { rec };
    });
    if (result.conflict) return res.status(409).json({ error: result.conflict });

    const { rec } = result;
    res.json({
      keyId: config.keyId, // public key, safe for the browser
      razorpayOrderId: rec.razorpayOrderId,
      amount: rec.amount,
      currency: rec.currency,
      businessName: config.businessName,
      prefill: order.customer || undefined,
    });
  }));

  // ======================================================================
  // 2) browser reports success -> verify signature, then confirm with Razorpay itself
  // Responses: 200 {status:'paid'} | 202 {status:'pending'} (webhook/reconciler will finish) | 402/409 = payment not applied (refund is automatic)
  // ======================================================================
  router.post('/verify', ipLimiter, auth, userLimiter, json, wrap(async (req, res) => {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!isId(orderId) || !isRzpId(razorpay_order_id, 'order') || !isRzpId(razorpay_payment_id, 'pay')
      || typeof razorpay_signature !== 'string' || razorpay_signature.length !== 64) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Cheap CPU check first: forged requests never reach the database or Razorpay.
    const sigOk = service.verifyPaymentSignature({
      orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature,
    });
    if (!sigOk) {
      logger.warn('[razorpay] bad signature', { orderId: String(orderId).slice(0, 100) });
      return res.status(400).json({ error: 'Signature verification failed' });
    }

    const order = await getOrder(orderId, req); // ownership check
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const rec = await store.getByRazorpayOrderId(razorpay_order_id);
    if (!rec || String(rec.internalOrderId) !== String(orderId)) {
      return res.status(400).json({ error: 'Order mismatch' });
    }
    if (rec.status === 'paid' && rec.paymentId === razorpay_payment_id) return res.json({ status: 'paid', orderId }); // fast path, no API call

    const NOT_APPLIED = 'Your payment could not be applied to this order. It is being refunded automatically.';
    // The order total changed after this Razorpay order was created: never fulfil, refund.
    if (rec.status === 'created' && !rec.paymentId && order.amount !== rec.amount) {
      if (await rejectPayment(rec, { id: razorpay_payment_id, amount: rec.amount }, 'order_amount_changed', { expected: order.amount, paid: rec.amount })) {
        return res.status(409).json({ error: NOT_APPLIED });
      }
    }

    // Defence in depth: confirm real state & amount directly with Razorpay.
    // If Razorpay is slow/unreachable we do NOT tell the customer it failed: the signature is valid,
    // so the webhook / reconciler will finish the job.
    let payment;
    try {
      payment = await service.fetchPayment(razorpay_payment_id);
    } catch (err) {
      logger.error('[razorpay] fetchPayment failed during verify', err && err.error ? err.error : err);
      return res.status(202).json({ status: 'pending' });
    }
    if (payment.order_id !== rec.razorpayOrderId) { // not even our order's payment: nothing of ours to refund
      await anomaly('payment_order_mismatch', rec, payment);
      return res.status(400).json({ error: 'Payment mismatch' });
    }
    if (payment.amount !== rec.amount || payment.currency !== rec.currency) {
      if (payment.status === 'captured' && await rejectPayment(rec, payment, 'verify_amount_mismatch', { expected: rec.amount })) {
        return res.status(409).json({ error: NOT_APPLIED });
      }
      return res.status(400).json({ error: 'Payment mismatch' });
    }
    if (payment.status === 'failed') return res.status(402).json({ error: 'Payment failed' });
    if (payment.status === 'refunded') return res.status(409).json({ error: 'Payment was refunded' });

    try {
      payment = await ensureCaptured(payment, rec);
      if (payment.status !== 'captured') return res.status(202).json({ status: 'pending' });

      const outcome = await finalize(rec, payment, 'verify');
      if (outcome === 'busy') { metric('razorpay.verify.pending'); return res.status(202).json({ status: 'pending' }); }
      if (outcome === 'refunded') return res.status(409).json({ error: NOT_APPLIED });
      // 'done' | 'already' | 'duplicate' (this was a surplus payment, refunded; the order itself IS paid)
    } catch (err) {
      // Money is taken; fulfilment hiccuped. finalize() released the claim, so the webhook retry /
      // reconciler will complete it. Don't show the customer a scary error.
      logger.error('[razorpay] fulfilment failed during verify (will be retried)', { orderId: String(orderId).slice(0, 100), err });
      return res.status(202).json({ status: 'pending' });
    }
    metric('razorpay.verify.paid');
    res.json({ status: 'paid', orderId });
  }));

  // ======================================================================
  // 2b) status check (order-success page reload, polling, redirect-based payment flows)
  // ======================================================================
  router.get('/status/:orderId', ipLimiter, auth, statusLimiter, wrap(async (req, res) => {
    const { orderId } = req.params;
    if (!isId(orderId)) return res.status(400).json({ error: 'Invalid orderId' });
    const order = await getOrder(orderId, req);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const rec = await store.getByInternalOrderId(orderId);
    let status = 'unpaid';
    if (rec && rec.status === 'paid') status = 'paid';
    else if (rec && rec.status === 'refunded') status = 'refunded';
    else if (rec && (rec.status === 'processing' || (rec.status === 'created' && rec.paymentId))) status = 'processing';
    else if (order.alreadyPaid) status = 'paid';
    res.json({ orderId, status });
  }));

  // ======================================================================
  // 3) Razorpay -> your server. Uses the RAW body for signature checking, so this router must be mounted
  //    BEFORE any global express.json(). Answers 5xx whenever a retry could help, 200 when nothing ever could.
  // ======================================================================
  router.post('/webhook', express.raw({ type: '*/*', limit: '256kb' }), wrap(async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      logger.error('[razorpay] webhook body was already parsed. Mount the payments router BEFORE express.json()/sanitizers.');
      return res.status(500).json({ error: 'Webhook misconfigured' });
    }
    const signature = req.get('x-razorpay-signature');
    if (!signature || !service.verifyWebhookSignature(req.body, signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    let event;
    try { event = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).json({ error: 'Bad JSON' }); }

    const payload = (event && event.payload) || {};
    const payment = payload.payment && payload.payment.entity;
    if (!payment || !payment.order_id) return res.status(200).json({ received: true }); // event type we don't use

    const rec = await store.getByRazorpayOrderId(payment.order_id);
    if (!rec) return res.status(200).json({ received: true }); // not one of ours

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      if (payment.status !== 'captured') return res.status(200).json({ received: true });
      if (payment.amount !== rec.amount || payment.currency !== rec.currency) {
        // Cannot legitimately happen (amount is fixed by the Razorpay order). Never fulfil; give the money back.
        await rejectPayment(rec, payment, 'webhook_amount_mismatch', { expected: rec.amount });
        return res.status(200).json({ received: true });
      }
      const outcome = await finalize(rec, payment, 'webhook'); // throws -> 500 -> Razorpay retries
      if (outcome === 'busy') return res.status(503).json({ error: 'Busy, retry' }); // another worker is mid-fulfilment
    } else if (event.event === 'payment.failed') {
      // Only report if the order isn't already paid (an old failed attempt can arrive AFTER a later success).
      const recorded = await store.markFailed(rec.razorpayOrderId, { paymentId: payment.id, reason: payment.error_description });
      if (recorded && onPaymentFailed) {
        try {
          await onPaymentFailed({ internalOrderId: rec.internalOrderId, paymentId: payment.id, reason: payment.error_description });
        } catch (e) { logger.error('[razorpay] onPaymentFailed threw', e); }
      }
    } else if (event.event === 'refund.processed' && onPaymentRefunded) {
      // Refund started elsewhere (Razorpay dashboard / dispute). Tell the host so the order isn't left "paid".
      const refund = payload.refund && payload.refund.entity;
      try {
        await onPaymentRefunded({
          internalOrderId: rec.internalOrderId, razorpayOrderId: rec.razorpayOrderId, paymentId: payment.id,
          refundId: refund && refund.id, amount: refund && refund.amount,
          fullyRefunded: (payment.amount_refunded || 0) >= payment.amount, reason: 'razorpay_refund', source: 'webhook',
        });
      } catch (e) { logger.error('[razorpay] onPaymentRefunded threw', e); return res.status(500).json({ error: 'Retry' }); }
    }
    res.status(200).json({ received: true });
  }));

  // Never leak internals to the client, but keep proper codes (413 too large, 400 bad JSON, 503 saturated ...)
  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, next) => {
    if (err && err.code === 'RZP_BUSY') { res.set('Retry-After', '2'); return res.status(503).json({ error: 'Payment service is busy, please retry' }); }
    const status = Number(err && (err.status || err.statusCode));
    if (status >= 400 && status < 500) return res.status(status).json({ error: 'Invalid request' });
    logger.error('[razorpay] error:', err && err.error ? JSON.stringify(err.error) : err);
    res.status(500).json({ error: 'Payment service error' });
  });

  // ======================================================================
  // reconciler: recovers EVERYTHING that webhooks / the browser missed, and finishes unfinished refunds.
  // Per-record schedule with backoff (indexed query, so it stays fast with lakhs of orders). Safe on every server at once:
  // each due record is won by exactly one server (compare-and-set).
  // ======================================================================
  function nextCheckAt(rec, attempts) {
    if (rec.status === 'paid') return null; // the single duplicate-payment look is done
    const age = now() - +new Date(rec.createdAt);
    const hasPayment = Boolean(rec.paymentId);
    if (!hasPayment && (attempts >= rc.maxChecks || age > rc.maxAgeMs)) return null; // abandoned cart: stop
    const steps = hasPayment ? rc.paidStepsMs : rc.unpaidStepsMs;
    return at(steps[Math.min(attempts - 1, steps.length - 1)]);
  }

  async function retryRefunds(limit) {
    const rows = await store.listPendingRefunds({ limit });
    let done = 0;
    for (const row of rows) {
      try {
        const out = await executeRefund({
          payment: { id: row.paymentId, amount: row.amount },
          rec: { razorpayOrderId: row.razorpayOrderId, internalOrderId: row.internalOrderId },
          reason: row.reason,
        });
        if (out === 'refunded') done += 1;
      } catch (err) { logger.error('[razorpay] refund retry failed', { paymentId: row.paymentId, err }); }
    }
    return { refundsRetried: rows.length, refundsDone: done };
  }

  async function reconcile(o = {}) {
    const limit = o.limit || 100;
    const pending = await store.listPending({ limit });
    let fixed = 0; let skipped = 0; let refundsDone = 0;
    for (const rec of pending) {
      let won = false;
      try {
        // 1) take a LEASE on the record (compare-and-set: one server wins). Nothing is rescheduled yet.
        won = await store.claimReconcile(rec.razorpayOrderId, at(rc.leaseMs));
        if (!won) { skipped += 1; continue; } // another server took it
        const fresh = await store.getByRazorpayOrderId(rec.razorpayOrderId);
        const wasPaid = fresh.status === 'paid';

        // 2) do the work
        if (fresh.status === 'refunded' && fresh.paymentId) { // decision was made but the refund may not have run (crash): finish it
          if ((await executeRefund({ payment: { id: fresh.paymentId, amount: fresh.amount }, rec: fresh, reason: 'recovery' })) === 'refunded') refundsDone += 1;
        }
        // Look at every payment Razorpay has for this order. Whatever state the order is in (open, paid, refunded) this finds
        // a payment whose webhook was lost: finalize() fulfils the right one and refunds any surplus one.
        const list = await service.fetchOrderPayments(fresh.razorpayOrderId);
        const items = ((list && list.items) || [])
          .filter((p) => p.status === 'captured' || p.status === 'authorized')
          .sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
        for (const p of items) {
          let cur = await store.getByRazorpayOrderId(fresh.razorpayOrderId);
          if (p.amount !== cur.amount || p.currency !== cur.currency) { await rejectPayment(cur, p, 'reconcile_amount_mismatch', { expected: cur.amount }); continue; }
          const cap = await ensureCaptured(p, cur);
          if (cap.status !== 'captured') continue;
          cur = await store.getByRazorpayOrderId(fresh.razorpayOrderId);
          if ((await finalize(cur, cap, 'reconcile')) === 'done') fixed += 1;
        }

        // 3) ONLY NOW decide the next check (so a crash/lost ack above can never make a record disappear)
        const after = await store.getByRazorpayOrderId(rec.razorpayOrderId);
        const attempts = (rec.reconcileChecks || 0) + 1;
        let next;
        if (wasPaid || after.status === 'refunded') next = null;                                          // duplicate look done / refund tracked by its own queue
        else if (after.status === 'paid') next = rc.duplicateCheckMs > 0 ? at(rc.duplicateCheckMs) : null; // just fulfilled: one later look for a surplus payment
        else next = nextCheckAt(after, attempts);
        await store.rescheduleReconcile(rec.razorpayOrderId, next, { count: true });
      } catch (err) {
        logger.error('[razorpay] reconcile failed for order', { razorpayOrderId: rec.razorpayOrderId, err });
        if (won) { // a transient error must not use up a check or lose the record: look again soon
          try { await store.rescheduleReconcile(rec.razorpayOrderId, at(rc.paidStepsMs[0])); } catch (_) { /* the lease expires and it comes back anyway */ }
        }
      }
    }
    const refunds = await retryRefunds(limit);
    if (fixed) metric('razorpay.reconcile.fixed');
    return { checked: pending.length, fixed, skipped, refundsRetried: refunds.refundsRetried, refundsDone: refundsDone + refunds.refundsDone };
  }

  /** Call once at server start. Returns a stop() function. Safe to run on every server. */
  function startReconciler({ intervalMs = 60 * 1000, ...o } = {}) {
    let stopped = false;
    let timer;
    const loop = async () => {
      try {
        const r = await reconcile(o);
        if (r.fixed) logger.warn(`[razorpay] reconciler completed ${r.fixed} missed payment(s)`);
      } catch (err) {
        logger.error('[razorpay] reconciler error', err);
      }
      if (!stopped) { timer = setTimeout(loop, Math.round(intervalMs * (0.8 + Math.random() * 0.4))); if (timer.unref) timer.unref(); }
    };
    timer = setTimeout(loop, Math.round(intervalMs / 2));
    if (timer.unref) timer.unref();
    return () => { stopped = true; clearTimeout(timer); };
  }

  return { router, service, config, reconcile, startReconciler };
}

module.exports = {
  createRazorpayModule, MemoryStore, createMongoStore, CannotFulfil, createIdempotency, priceOrder, PricingError,
};
