'use strict';

const crypto = require('crypto');
const Razorpay = require('razorpay');

/** Constant-time comparison of two strings (hex signatures). */
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function hmacSha256Hex(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/** Rejects if `promise` takes longer than `ms`. The Razorpay SDK has no timeout of its own. */
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('Razorpay request timed out'), { code: 'RZP_TIMEOUT' })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Temporary problems worth retrying on READ-style calls: timeouts, 429, 5xx, dropped connections. */
function isTransient(e) {
  if (!e || e.code === 'RZP_BUSY') return false;
  if (e.code === 'RZP_TIMEOUT') return true;
  const status = Number(e.statusCode || e.status);
  if (status) return status === 429 || status >= 500;
  return /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EPIPE|socket hang up|network/i.test(`${e.code || ''} ${e.message || ''}`);
}

/**
 * Thin, server-side-only wrapper around the Razorpay SDK.
 * The key secret never leaves this file / the server.
 *
 * Protection for traffic spikes: at most cfg.maxConcurrent Razorpay calls in flight, a bounded wait queue
 * (cfg.maxQueue), then fast rejection with code RZP_BUSY (the API turns that into a 503 "try again").
 */
function createService(cfg, clientOverride) {
  const client = clientOverride || new Razorpay({ key_id: cfg.keyId, key_secret: cfg.keySecret });

  let active = 0;
  const waiting = [];
  const busy = () => Object.assign(new Error('Razorpay client saturated'), { code: 'RZP_BUSY' });
  const acquire = () => new Promise((resolve, reject) => {
    if (active < cfg.maxConcurrent) { active += 1; resolve(); return; }
    if (waiting.length >= cfg.maxQueue) { reject(busy()); return; }
    // a request that waited too long is dropped: its browser has most likely given up already
    const entry = { resolve };
    entry.timer = setTimeout(() => {
      const i = waiting.indexOf(entry);
      if (i >= 0) waiting.splice(i, 1);
      reject(busy());
    }, cfg.queueWaitMs);
    if (entry.timer.unref) entry.timer.unref();
    waiting.push(entry);
  });
  const release = () => {
    const next = waiting.shift();
    if (next) { clearTimeout(next.timer); next.resolve(); } else active -= 1;
  };

  /** one attempt: concurrency slot + timeout */
  const once = async (fn) => {
    await acquire();
    try { return await withTimeout(Promise.resolve().then(fn), cfg.apiTimeoutMs); } finally { release(); }
  };
  /** retries only transient errors, backing off OUTSIDE the concurrency slot */
  const withRetry = async (fn, retries) => {
    for (let i = 0; ; i += 1) {
      try { return await once(fn); } catch (e) {
        if (i >= retries || !isTransient(e)) throw e;
        await sleep(cfg.retryBaseMs * 2 ** i + Math.floor(Math.random() * (cfg.retryBaseMs / 2 + 1)));
      }
    }
  };

  return {
    /** @param {number} amount Amount in PAISE (integer). Rs 499.50 => 49950. An extra order from a retry is harmless (never saved => never payable). */
    createOrder({ amount, currency = cfg.currency, receipt, notes = {} }) {
      return withRetry(() => client.orders.create({
        amount,
        currency,
        receipt: String(receipt).slice(0, 40), // Razorpay limit: 40 chars
        payment_capture: 1, // auto-capture on successful payment
        notes,
      }), 1);
    },

    /** Checks the signature Razorpay Checkout hands to the browser. */
    verifyPaymentSignature({ orderId, paymentId, signature }) {
      return safeEqualHex(hmacSha256Hex(cfg.keySecret, `${orderId}|${paymentId}`), signature);
    },

    /** Checks the X-Razorpay-Signature header on webhooks. rawBody must be the exact Buffer received. */
    verifyWebhookSignature(rawBody, signature) {
      return safeEqualHex(hmacSha256Hex(cfg.webhookSecret, rawBody), signature);
    },

    /** Source of truth: ask Razorpay for the real payment state. */
    fetchPayment(paymentId) {
      return withRetry(() => client.payments.fetch(paymentId), 2);
    },

    /** All payment attempts made against one Razorpay order (used by the reconciler). */
    fetchOrderPayments(razorpayOrderId) {
      return withRetry(() => client.orders.fetchPayments(razorpayOrderId), 2);
    },

    /** Only needed if your Razorpay account is set to MANUAL capture (status 'authorized'). */
    capturePayment(paymentId, amount, currency = cfg.currency) {
      return once(() => client.payments.capture(paymentId, amount, currency));
    },

    /**
     * Full refund if `amount` omitted, partial (integer paise) otherwise. NOT retried here: the module's durable refund
     * queue owns retries, and checks Razorpay's `amount_refunded` first so a lost response can never refund twice.
     */
    refund(paymentId, { amount, notes = {}, receipt, speed } = {}) {
      const payload = { notes };
      if (amount !== undefined) {
        if (!Number.isInteger(amount) || amount < 100) throw new Error('[razorpay] refund amount must be integer paise >= 100');
        payload.amount = amount;
      }
      if (receipt) payload.receipt = String(receipt).slice(0, 40);
      if (speed) payload.speed = speed;
      return once(() => client.payments.refund(paymentId, payload));
    },
  };
}

module.exports = { createService, safeEqualHex, hmacSha256Hex, withTimeout, isTransient };
