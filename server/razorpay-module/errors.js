'use strict';

/**
 * Throw this from onPaymentSuccess when the order can NEVER be fulfilled
 * (cancelled, out of stock, total changed, order deleted...). The module then refunds the
 * customer automatically instead of retrying forever.
 * Throw any OTHER error for temporary problems (DB down...): those are retried.
 */
class CannotFulfil extends Error {
  constructor(message) {
    super(message || 'Order cannot be fulfilled');
    this.name = 'CannotFulfil';
    this.cannotFulfil = true;
  }
}
const isCannotFulfil = (e) => Boolean(e && (e instanceof CannotFulfil || e.cannotFulfil === true));

module.exports = { CannotFulfil, isCannotFulfil };
