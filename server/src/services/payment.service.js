import logger from '../config/logger.js';

/**
 * Payment service abstraction.
 *
 * This interface defines the contract for any payment provider.
 * Currently implemented as a no-op stub. To integrate Razorpay:
 *   1. Create src/services/razorpay.payment.service.js implementing this interface
 *   2. Replace the export in this file with the Razorpay implementation
 *   3. No changes to checkout/order logic required
 *
 * Interface contract:
 *   - createOrder(params) → { providerOrderId, ...providerData }
 *   - verifyPayment(params) → boolean
 *   - handleWebhook(payload, signature) → { event, orderId, paymentId }
 *   - initiateRefund(params) → { refundId, ...providerData }
 */
const paymentServiceStub = {
  /**
   * Create a payment order with the provider.
   * Called before the user sees the payment page.
   *
   * For Razorpay: calls razorpay.orders.create({ amount, currency, receipt })
   */
  async createOrder({ amountPaise, currency = 'INR', receipt, notes }) {
    logger.info({ amountPaise, currency, receipt }, '[PaymentService STUB] createOrder called');
    // Return structure matches what checkout stores in order.payment
    return {
      providerOrderId: null,
      metadata: { stub: true, amountPaise },
    };
  },

  /**
   * Verify a payment signature/status after user completes payment.
   * Called by the webhook or frontend callback.
   *
   * For Razorpay: validates HMAC-SHA256 of orderId + '|' + paymentId
   */
  async verifyPayment({ providerOrderId, providerPaymentId, providerSignature }) {
    logger.info({ providerOrderId }, '[PaymentService STUB] verifyPayment called');
    return false; // stub always returns false — no real verification
  },

  /**
   * Handle a raw webhook payload from the payment provider.
   * Extracts the event type and relevant IDs.
   *
   * For Razorpay: validates X-Razorpay-Signature header, parses event body
   */
  async handleWebhook(rawBody, signature, secret) {
    logger.info('[PaymentService STUB] handleWebhook called');
    return null;
  },

  /**
   * Initiate a refund for a given payment.
   *
   * For Razorpay: calls razorpay.payments.refund(paymentId, { amount })
   */
  async initiateRefund({ providerPaymentId, amountPaise, notes }) {
    logger.info({ providerPaymentId, amountPaise }, '[PaymentService STUB] initiateRefund called');
    return { refundId: null };
  },
};

export const paymentService = paymentServiceStub;
