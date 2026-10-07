'use strict';

const crypto = require('crypto');

/**
 * Production store for MongoDB / Mongoose (v6+). Every state change is ONE atomic updateOne()
 * (compare-and-set on the current state), so it is safe with many Node processes / servers at once.
 *
 *   const { createMongoStore } = require('./razorpay-module');
 *   const store = createMongoStore(mongoose);      // pass YOUR mongoose instance
 *   await store.ensureIndexes();                   // once at startup (needed if autoIndex is off)
 *
 * Use a connection string with  ?retryWrites=true&w=majority  so acknowledged writes survive a primary failover.
 *
 * Order record lifecycle:
 *   created --claim--> processing --complete--> paid
 *      |                   |  `--release--> created (retry later)
 *      +-- markRefunded ---+--> refunded      (decision: this payment will NOT fulfil the order, it gets refunded)
 *      +-- retire --> superseded              (a newer Razorpay order replaced it)
 * Refund lifecycle (one row per payment id):  refunding -> refunded | failed (retried with backoff)
 */
function createMongoStore(mongoose, {
  modelName = 'RazorpayOrder', refundModelName = 'RazorpayRefund',
  collection = 'razorpay_orders', refundCollection = 'razorpay_refunds', clock,
} = {}) {
  if (!mongoose || !mongoose.Schema) throw new Error('[razorpay] createMongoStore(mongoose): pass your mongoose instance');
  const { Schema } = mongoose;
  const nowMs = clock || Date.now;
  const D = (ms) => new Date(ms);

  const schema = new Schema({
    internalOrderId: { type: String, required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true }, // paise
    currency: { type: String, required: true },
    status: { type: String, enum: ['created', 'processing', 'paid', 'refunded', 'superseded'], default: 'created' },
    isActive: { type: Boolean, default: true },
    paymentId: String,
    method: String,
    claimToken: String,
    lockedUntil: Date,
    paidAt: Date,
    firstClaimAt: Date,
    fulfilAttempts: { type: Number, default: 0 },
    nextReconcileAt: Date,
    reconcileChecks: { type: Number, default: 0 },
    lastFailure: Schema.Types.Mixed,
    lastError: String,
  }, { timestamps: true, collection });
  // Exactly ONE active Razorpay order per internal order, enforced by the database itself.
  schema.index({ internalOrderId: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
  schema.index({ nextReconcileAt: 1 }); // the reconciler's only query: due records, oldest first. Stays small & fast at any volume.

  const refundSchema = new Schema({
    paymentId: { type: String, required: true, unique: true }, // one refund row per payment => can never be refunded twice
    razorpayOrderId: String,
    internalOrderId: String,
    amount: Number,
    reason: String,
    status: { type: String, enum: ['refunding', 'refunded', 'failed'], default: 'refunding' },
    attempts: { type: Number, default: 0 },
    lockedUntil: Date,
    nextRetryAt: Date,
    refundId: String,
    note: String,
    lastError: String,
    refundedAt: Date,
  }, { timestamps: true, collection: refundCollection });
  refundSchema.index({ status: 1, nextRetryAt: 1 });

  const Model = mongoose.models[modelName] || mongoose.model(modelName, schema);
  const Refund = mongoose.models[refundModelName] || mongoose.model(refundModelName, refundSchema);
  const one = (M, q) => M.findOne(q).lean();
  const nextSet = (d) => (d ? { $set: { nextReconcileAt: d } } : { $unset: { nextReconcileAt: 1 } });
  const merge = (...parts) => {
    const out = {};
    parts.forEach((p) => Object.entries(p).forEach(([op, v]) => { out[op] = { ...(out[op] || {}), ...v }; }));
    return out;
  };

  return {
    Model, Refund,
    ensureIndexes: async () => { await Model.createIndexes(); await Refund.createIndexes(); },

    // ---------- order records ----------
    /** Insert; if another request already created the active record for this order, return THAT one. */
    async save(rec) {
      const internalOrderId = String(rec.internalOrderId);
      try {
        const doc = await Model.create({ ...rec, internalOrderId, status: 'created', isActive: true });
        return doc.toObject();
      } catch (err) {
        if (err && err.code === 11000) {
          const winner = await one(Model, { internalOrderId, isActive: true });
          if (winner) return winner;
        }
        throw err;
      }
    },

    getByInternalOrderId: (id) => one(Model, { internalOrderId: String(id), isActive: true }),
    getByRazorpayOrderId: (id) => one(Model, { razorpayOrderId: id }),

    async retire(internalOrderId, { nextReconcileAt } = {}) {
      const key = String(internalOrderId);
      await Model.updateOne(
        { internalOrderId: key, isActive: true, status: 'created' },
        merge({ $set: { status: 'superseded', isActive: false } }, nextSet(nextReconcileAt)),
      );
      await Model.updateOne({ internalOrderId: key, isActive: true, status: 'refunded' }, { $set: { isActive: false } });
    },

    /** Atomic compare-and-set. Returns a fencing token for the ONE caller that now owns fulfilment, else null. */
    async claim(razorpayOrderId, { paymentId, method, leaseMs = 60000 }) {
      const now = nowMs();
      const token = crypto.randomUUID();
      const res = await Model.updateOne(
        {
          razorpayOrderId,
          $and: [
            { $or: [{ status: 'created' }, { status: 'processing', lockedUntil: { $lt: D(now) } }] },
            { $or: [{ paymentId: { $exists: false } }, { paymentId }] }, // an order is bound to the first payment that claims it
          ],
        },
        {
          $set: { status: 'processing', paymentId, method, claimToken: token, lockedUntil: D(now + leaseMs), nextReconcileAt: D(now + leaseMs) },
          $inc: { fulfilAttempts: 1 },
          $min: { firstClaimAt: D(now) },
        },
      );
      return res.matchedCount === 1 ? token : null;
    },

    async complete(razorpayOrderId, token, { nextReconcileAt } = {}) {
      const res = await Model.updateOne(
        { razorpayOrderId, status: 'processing', claimToken: token },
        merge({ $set: { status: 'paid', paidAt: D(nowMs()) }, $unset: { lockedUntil: 1, claimToken: 1 } }, nextSet(nextReconcileAt)),
      );
      return res.matchedCount === 1;
    },

    async release(razorpayOrderId, token, { error, nextReconcileAt } = {}) {
      const res = await Model.updateOne(
        { razorpayOrderId, status: 'processing', claimToken: token },
        merge({ $set: { status: 'created', lastError: error }, $unset: { lockedUntil: 1, claimToken: 1 } }, nextSet(nextReconcileAt)),
      );
      return res.matchedCount === 1;
    },

    /** Decision gate: true only if the order is not paid. Never overrides another payment's binding. */
    async markRefunded(razorpayOrderId, { token, paymentId, nextReconcileAt } = {}) {
      const stateFilter = token ? { status: 'processing', claimToken: token } : { status: 'created' };
      const filter = { razorpayOrderId, ...stateFilter };
      if (paymentId) filter.$or = [{ paymentId: { $exists: false } }, { paymentId }];
      const res = await Model.updateOne(
        filter,
        merge({ $set: { status: 'refunded', ...(paymentId ? { paymentId } : {}) }, $unset: { lockedUntil: 1, claimToken: 1 } }, nextSet(nextReconcileAt)),
      );
      return res.matchedCount === 1;
    },

    async markFailed(razorpayOrderId, info = {}) {
      const res = await Model.updateOne({ razorpayOrderId, status: 'created' }, { $set: { lastFailure: info } });
      // matched (not "modified"): Mongo reports 0 modified when a duplicate failure event changes nothing
      return res.matchedCount === 1;
    },

    // ---------- reconciler scheduling ----------
    listPending: ({ limit = 100 } = {}) => Model.find({ nextReconcileAt: { $lte: D(nowMs()) } }).sort({ nextReconcileAt: 1 }).limit(limit).lean(),

    /**
     * Compare-and-set LEASE: only ONE server wins a due record, and the record is parked until `leaseUntil`.
     * The real next-check time is written by rescheduleReconcile() AFTER the work succeeded, so a crash / lost
     * acknowledgement just means the record comes up again when the lease expires. Nothing is ever forgotten.
     */
    async claimReconcile(razorpayOrderId, leaseUntil) {
      const res = await Model.updateOne(
        { razorpayOrderId, nextReconcileAt: { $lte: D(nowMs()) } },
        { $set: { nextReconcileAt: leaseUntil } },
      );
      return res.matchedCount === 1;
    },

    /** Unconditional: set the next check (null = stop). `count` records that one full check was completed. */
    async rescheduleReconcile(razorpayOrderId, at, { count = false } = {}) {
      await Model.updateOne({ razorpayOrderId }, merge(nextSet(at), count ? { $inc: { reconcileChecks: 1 } } : {}));
    },

    // ---------- refund queue ----------
    /** Returns the refund row if THIS caller should execute the refund now, else null. */
    async claimRefund({ paymentId, razorpayOrderId, internalOrderId, amount, reason, leaseMs = 60000 }) {
      const now = nowMs();
      try {
        const doc = await Refund.create({
          paymentId, razorpayOrderId, internalOrderId: String(internalOrderId), amount, reason,
          status: 'refunding', attempts: 1, lockedUntil: D(now + leaseMs),
        });
        return doc.toObject();
      } catch (err) {
        if (!(err && err.code === 11000)) throw err;
      }
      const res = await Refund.updateOne(
        { paymentId, $or: [{ status: 'failed', nextRetryAt: { $lte: D(now) } }, { status: 'refunding', lockedUntil: { $lt: D(now) } }] },
        { $set: { status: 'refunding', lockedUntil: D(now + leaseMs) }, $unset: { nextRetryAt: 1 }, $inc: { attempts: 1 } },
      );
      return res.matchedCount === 1 ? one(Refund, { paymentId }) : null;
    },

    async completeRefund(paymentId, { refundId, note } = {}) {
      await Refund.updateOne(
        { paymentId, status: { $ne: 'refunded' } },
        { $set: { status: 'refunded', refundId, note, refundedAt: D(nowMs()) }, $unset: { lockedUntil: 1, nextRetryAt: 1 } },
      );
    },

    async failRefund(paymentId, { error, nextRetryAt } = {}) {
      await Refund.updateOne(
        { paymentId, status: { $ne: 'refunded' } },
        merge({ $set: { status: 'failed', lastError: error }, $unset: { lockedUntil: 1 } }, nextRetryAt ? { $set: { nextRetryAt } } : { $unset: { nextRetryAt: 1 } }),
      );
    },

    listPendingRefunds: ({ limit = 100 } = {}) => Refund.find({
      $or: [{ status: 'failed', nextRetryAt: { $lte: D(nowMs()) } }, { status: 'refunding', lockedUntil: { $lt: D(nowMs()) } }],
    }).limit(limit).lean(),

    getRefund: (paymentId) => one(Refund, { paymentId }),
  };
}

module.exports = { createMongoStore };
