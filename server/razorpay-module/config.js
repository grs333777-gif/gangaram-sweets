'use strict';

const clean = (v) => (typeof v === 'string' ? v.trim() : v); // stray spaces in .env silently break HMAC checks
const num = (v, d) => (Number(v) > 0 ? Number(v) : d);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/**
 * Loads + validates configuration. Fails fast at startup so you never
 * run with a half-configured payment system.
 */
function loadConfig(overrides = {}) {
  const pick = (key, envKey) => clean(overrides[key] !== undefined ? overrides[key] : process.env[envKey]);

  const cfg = {
    keyId: pick('keyId', 'RAZORPAY_KEY_ID'),
    keySecret: pick('keySecret', 'RAZORPAY_KEY_SECRET'),
    webhookSecret: pick('webhookSecret', 'RAZORPAY_WEBHOOK_SECRET'),
    businessName: pick('businessName', 'RAZORPAY_BUSINESS_NAME') || 'My Store',
    currency: overrides.currency || 'INR',

    // Hard safety rails on what a customer can be charged (paise). Razorpay's own minimum is Rs 1.
    minAmount: Math.max(100, num(overrides.minAmount, 100)),
    maxAmount: num(overrides.maxAmount, 50000000), // Rs 5,00,000. Raise deliberately if you sell bigger baskets.

    // One worker "owns" a payment for this long while running onPaymentSuccess. After that another worker may take over,
    // so onPaymentSuccess MUST be idempotent.
    leaseMs: num(overrides.leaseMs, MIN),

    // Razorpay API protection: every call has a timeout, at most `maxConcurrent` run at once, the rest wait in a bounded queue.
    apiTimeoutMs: num(overrides.apiTimeoutMs, 10 * 1000),
    maxConcurrent: num(overrides.maxConcurrent, 50),
    maxQueue: num(overrides.maxQueue, 1000),
    queueWaitMs: num(overrides.queueWaitMs, 8 * 1000),
    retryBaseMs: overrides.retryBaseMs !== undefined ? Number(overrides.retryBaseMs) : 150,

    // Compensation: refund customers automatically when an order can't be fulfilled.
    autoRefund: {
      enabled: overrides.autoRefund !== false,
      stuckAfterAttempts: 6,   // fulfilment failed this many times AND ...
      stuckAfterMs: 2 * HOUR,  // ... it's been this long since the first attempt => give up and refund
      maxRefundAttempts: 12,
      refundLeaseMs: MIN,
      refundBackoffMs: [30 * 1000, 2 * MIN, 10 * MIN, 30 * MIN, HOUR, 3 * HOUR, 6 * HOUR],
      ...(overrides.autoRefund && typeof overrides.autoRefund === 'object' ? overrides.autoRefund : {}),
    },

    // Background reconciler schedule (per record, with backoff).
    reconcile: {
      firstCheckMs: 3 * MIN,
      unpaidStepsMs: [10 * MIN, 30 * MIN, 2 * HOUR, 6 * HOUR, 12 * HOUR], // abandoned carts: a few checks, then left alone
      paidStepsMs: [MIN, 2 * MIN, 5 * MIN, 15 * MIN, 30 * MIN],           // money taken but not fulfilled: keep trying
      leaseMs: 2 * MIN,   // a server that takes a due record owns it this long; if it dies the record comes back
      maxChecks: 6,
      maxAgeMs: 3 * 24 * HOUR,
      duplicateCheckMs: 20 * MIN, // one look after a successful payment for a second (duplicate) payment. 0 = off
      ...(overrides.reconcile || {}),
    },
  };

  const missing = ['keyId', 'keySecret', 'webhookSecret'].filter((k) => !cfg[k]);
  if (missing.length) {
    throw new Error(`[razorpay] Missing config: ${missing.join(', ')}`);
  }
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(cfg.keyId)) {
    throw new Error('[razorpay] RAZORPAY_KEY_ID must look like rzp_test_xxx or rzp_live_xxx');
  }
  if (cfg.webhookSecret === cfg.keySecret) {
    throw new Error('[razorpay] Webhook secret must be different from the API key secret');
  }
  if (cfg.webhookSecret.length < 16) {
    throw new Error('[razorpay] Webhook secret is too short (use 16+ random characters)');
  }
  if (cfg.maxAmount < cfg.minAmount) throw new Error('[razorpay] maxAmount must be >= minAmount');
  cfg.isLive = cfg.keyId.startsWith('rzp_live_');
  return Object.freeze(cfg);
}

module.exports = { loadConfig };
