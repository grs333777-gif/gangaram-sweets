'use strict';

const crypto = require('crypto');

/**
 * DEVELOPMENT / TEST ONLY. Data is lost on restart and is not shared between server
 * instances. The module refuses to use it in production or with live keys.
 * Use stores/mongo-store.js (or your own implementation of the same interface).
 *
 * Order record lifecycle:
 *   created --claim--> processing --complete--> paid
 *      |                   |  `--release--> created (retry later)
 *      +-- markRefunded ---+--> refunded      (decision: this payment will NOT fulfil the order, it gets refunded)
 *      +-- retire --> superseded              (a newer Razorpay order replaced it)
 * Refund lifecycle (one row per payment id):  refunding -> refunded | failed (retried with backoff)
 */
class MemoryStore {
  constructor({ clock } = {}) {
    this.clock = clock || Date.now;
    this.byRzpId = new Map();
    this.byInternalId = new Map(); // internalOrderId -> ACTIVE record
    this.refunds = new Map();      // paymentId -> refund record
  }

  _ms() { return this.clock(); }
  _date(ms) { return new Date(ms); }
  _due(d) { return d && +d <= this._ms(); }
  _setNext(rec, d) { if (d) rec.nextReconcileAt = d; else delete rec.nextReconcileAt; }

  // ---------- order records ----------
  async save(rec) {
    const key = String(rec.internalOrderId);
    const existing = this.byInternalId.get(key);
    if (existing && existing.isActive) return { ...existing }; // lost a create race -> use the winner
    const record = {
      status: 'created', isActive: true, reconcileChecks: 0, fulfilAttempts: 0, createdAt: this._date(this._ms()), ...rec, internalOrderId: key,
    };
    this.byRzpId.set(record.razorpayOrderId, record);
    this.byInternalId.set(key, record);
    return { ...record };
  }

  async getByInternalOrderId(id) {
    const rec = this.byInternalId.get(String(id));
    return rec && rec.isActive ? { ...rec } : null;
  }

  async getByRazorpayOrderId(id) {
    const rec = this.byRzpId.get(id);
    return rec ? { ...rec } : null;
  }

  /** Retire the active record so a new Razorpay order can be made. Unpaid orders stay reconcilable (a late payment is still found). */
  async retire(internalOrderId, { nextReconcileAt } = {}) {
    const rec = this.byInternalId.get(String(internalOrderId));
    if (!rec || !rec.isActive) return;
    if (rec.status === 'created') { rec.status = 'superseded'; rec.isActive = false; this._setNext(rec, nextReconcileAt); }
    else if (rec.status === 'refunded') rec.isActive = false;
  }

  /**
   * MUST be atomic. Returns a fencing TOKEN for the single caller that now owns fulfilment, else null.
   * Allowed from: created, or processing with an expired lease (crash recovery).
   * A Razorpay order is bound to the FIRST payment id that claims it: any other payment id can never claim it.
   */
  async claim(razorpayOrderId, { paymentId, method, leaseMs = 60000 }) {
    const rec = this.byRzpId.get(razorpayOrderId);
    if (!rec) return null;
    const now = this._ms();
    const leaseExpired = rec.status === 'processing' && rec.lockedUntil && +rec.lockedUntil < now;
    if (rec.status !== 'created' && !leaseExpired) return null;
    if (rec.paymentId && rec.paymentId !== paymentId) return null;
    const token = crypto.randomUUID();
    Object.assign(rec, {
      status: 'processing', paymentId, method, claimToken: token,
      lockedUntil: this._date(now + leaseMs), nextReconcileAt: this._date(now + leaseMs),
      fulfilAttempts: (rec.fulfilAttempts || 0) + 1,
    });
    if (!rec.firstClaimAt) rec.firstClaimAt = this._date(now);
    return token;
  }

  /** Fulfilment finished: processing -> paid. Only the current token holder can do this. */
  async complete(razorpayOrderId, token, { nextReconcileAt } = {}) {
    const rec = this.byRzpId.get(razorpayOrderId);
    if (!rec || rec.status !== 'processing' || rec.claimToken !== token) return false;
    rec.status = 'paid'; rec.paidAt = this._date(this._ms());
    delete rec.lockedUntil; delete rec.claimToken; this._setNext(rec, nextReconcileAt);
    return true;
  }

  /** Fulfilment threw (temporary): processing -> created so a webhook retry / the reconciler can run it again. */
  async release(razorpayOrderId, token, { error, nextReconcileAt } = {}) {
    const rec = this.byRzpId.get(razorpayOrderId);
    if (!rec || rec.status !== 'processing' || rec.claimToken !== token) return false;
    rec.status = 'created'; rec.lastError = error;
    delete rec.lockedUntil; delete rec.claimToken; this._setNext(rec, nextReconcileAt);
    return true;
  }

  /**
   * Decision gate, atomic: "this payment will be refunded, never fulfilled". True only if the order is not paid.
   * With `token`: from processing owned by that token. Without: from created only. Never overrides another payment's binding.
   */
  async markRefunded(razorpayOrderId, { token, paymentId, nextReconcileAt } = {}) {
    const rec = this.byRzpId.get(razorpayOrderId);
    if (!rec) return false;
    const stateOk = token ? (rec.status === 'processing' && rec.claimToken === token) : rec.status === 'created';
    if (!stateOk) return false;
    if (rec.paymentId && paymentId && rec.paymentId !== paymentId) return false;
    rec.status = 'refunded';
    if (paymentId) rec.paymentId = paymentId;
    delete rec.lockedUntil; delete rec.claimToken; this._setNext(rec, nextReconcileAt);
    return true;
  }

  /** Records a failed attempt. Returns false (and changes nothing) if the order is already paid/processing/refunded. */
  async markFailed(razorpayOrderId, info = {}) {
    const rec = this.byRzpId.get(razorpayOrderId);
    if (!rec || rec.status !== 'created') return false;
    rec.lastFailure = info;
    return true;
  }

  // ---------- reconciler scheduling ----------
  /** Records whose nextReconcileAt has passed, most overdue first. */
  async listPending({ limit = 100 } = {}) {
    return [...this.byRzpId.values()]
      .filter((r) => this._due(r.nextReconcileAt))
      .sort((a, b) => +a.nextReconcileAt - +b.nextReconcileAt)
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }

  /**
   * Compare-and-set LEASE: only ONE server wins a due record, and the record is parked until `leaseUntil`.
   * The real next-check time is written by rescheduleReconcile() AFTER the work succeeded, so a crash / lost
   * acknowledgement just means the record comes up again when the lease expires. Nothing is ever forgotten.
   */
  async claimReconcile(razorpayOrderId, leaseUntil) {
    const rec = this.byRzpId.get(razorpayOrderId);
    if (!rec || !this._due(rec.nextReconcileAt)) return false;
    this._setNext(rec, leaseUntil);
    return true;
  }

  /** Unconditional: set the next check (null = stop). `count` records that one full check was completed. */
  async rescheduleReconcile(razorpayOrderId, at, { count = false } = {}) {
    const rec = this.byRzpId.get(razorpayOrderId);
    if (!rec) return;
    this._setNext(rec, at);
    if (count) rec.reconcileChecks = (rec.reconcileChecks || 0) + 1;
  }

  // ---------- refund queue (one row per payment id => a payment can never be refunded twice) ----------
  /** Returns the refund row if THIS caller should execute the refund now, else null (done / someone else is on it / backing off). */
  async claimRefund({ paymentId, razorpayOrderId, internalOrderId, amount, reason, leaseMs = 60000 }) {
    const now = this._ms();
    const ex = this.refunds.get(paymentId);
    if (!ex) {
      const row = {
        paymentId, razorpayOrderId, internalOrderId: String(internalOrderId), amount, reason,
        status: 'refunding', attempts: 1, lockedUntil: this._date(now + leaseMs), createdAt: this._date(now),
      };
      this.refunds.set(paymentId, row);
      return { ...row };
    }
    const retryable = (ex.status === 'failed' && ex.nextRetryAt && +ex.nextRetryAt <= now)
      || (ex.status === 'refunding' && +ex.lockedUntil < now);
    if (!retryable) return null;
    Object.assign(ex, { status: 'refunding', lockedUntil: this._date(now + leaseMs), attempts: ex.attempts + 1 });
    delete ex.nextRetryAt;
    return { ...ex };
  }

  async completeRefund(paymentId, { refundId, note } = {}) {
    const ex = this.refunds.get(paymentId);
    if (ex && ex.status !== 'refunded') { Object.assign(ex, { status: 'refunded', refundId, note, refundedAt: this._date(this._ms()) }); delete ex.lockedUntil; delete ex.nextRetryAt; }
  }

  async failRefund(paymentId, { error, nextRetryAt } = {}) {
    const ex = this.refunds.get(paymentId);
    if (!ex || ex.status === 'refunded') return;
    ex.status = 'failed'; ex.lastError = error; delete ex.lockedUntil;
    if (nextRetryAt) ex.nextRetryAt = nextRetryAt; else delete ex.nextRetryAt;
  }

  async listPendingRefunds({ limit = 100 } = {}) {
    const now = this._ms();
    return [...this.refunds.values()]
      .filter((r) => (r.status === 'failed' && r.nextRetryAt && +r.nextRetryAt <= now) || (r.status === 'refunding' && +r.lockedUntil < now))
      .slice(0, limit).map((r) => ({ ...r }));
  }

  async getRefund(paymentId) {
    const r = this.refunds.get(paymentId);
    return r ? { ...r } : null;
  }
}

module.exports = { MemoryStore };
