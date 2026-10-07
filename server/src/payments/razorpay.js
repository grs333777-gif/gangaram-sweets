import { createRequire } from 'module';
import mongoose from 'mongoose';
import logger from '../config/logger.js';
import Order from '../models/Order.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';
import { markOrderPaid, markOrderRefunded } from '../services/order.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const require = createRequire(import.meta.url);
const {
  createRazorpayModule,
  createMongoStore,
  createIdempotency,
  CannotFulfil,
} = require('../../razorpay-module/index.js');

let payments = null;

export function getIdempotency() {
  return createIdempotency(mongoose);
}

export function isPaymentsReady() {
  return Boolean(payments);
}

/**
 * Mount-ready Razorpay router. Returns null when keys are not configured
 * so login and COD checkout still run.
 */
export function createPaymentsRouter() {
  if (payments) return payments.router;
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const missingOrPlaceholder = !keyId || !keySecret || !webhookSecret
    || keyId.includes('xxxx')
    || keySecret.includes('xxxx')
    || webhookSecret.startsWith('change_me');
  if (missingOrPlaceholder) {
    logger.warn('Razorpay keys are missing or still placeholders — online payments disabled');
    return null;
  }
  try {
    const store = createMongoStore(mongoose);
    payments = createRazorpayModule({
      store,
      authenticate,
      logger,
      getOrder: async (orderId, req) => {
        if (!mongoose.isValidObjectId(orderId)) return null;
        const order = await Order.findOne({ _id: orderId, user: req.user._id })
          .select('totalPaise paymentStatus')
          .lean();
        if (!order) return null;
        return {
          amount: order.totalPaise,
          alreadyPaid: order.paymentStatus === PAYMENT_STATUS.PAID,
          customer: {
            name: req.user.name,
            email: req.user.email,
            contact: req.user.phone,
          },
        };
      },
      checkOrder: async (orderId) => {
        if (!mongoose.isValidObjectId(orderId)) return null;
        const order = await Order.findById(orderId).select('totalPaise orderStatus').lean();
        if (!order) return null;
        return {
          amount: order.totalPaise,
          cancelled: order.orderStatus === ORDER_STATUS.CANCELLED,
        };
      },
      onPaymentSuccess: async ({ internalOrderId, razorpayOrderId, paymentId, amount, method }) => {
        const applied = await markOrderPaid({
          orderId: internalOrderId,
          amountPaise: amount,
          razorpayOrderId,
          paymentId,
          method,
        });
        if (applied === 'applied' || applied === 'already') return;
        throw new CannotFulfil('Order is cancelled, already paid by another payment, or its total changed');
      },
      onPaymentRefunded: async ({ internalOrderId, paymentId }) => {
        await markOrderRefunded({ orderId: internalOrderId, paymentId });
      },
      onPaymentAnomaly: async (info) => {
        logger.error({ info }, 'Razorpay payment anomaly');
      },
    });
    payments.store = store;
    return payments.router;
  } catch (err) {
    logger.warn({ err: err.message }, 'Razorpay is not configured — online payments disabled');
    payments = null;
    return null;
  }
}

export async function startPaymentWorkers() {
  if (!payments) return null;
  await payments.store.ensureIndexes();
  return payments.startReconciler();
}

/**
 * Full refund of a captured payment. A second call is safe if Razorpay already refunded it.
 */
export async function refundCapturedPayment(paymentId, amountPaise) {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keyId || !keySecret || keyId.includes('xxxx') || keySecret.includes('xxxx')) {
    const error = new Error('Online refunds are not configured');
    error.statusCode = 503;
    throw error;
  }
  const Razorpay = require('razorpay');
  const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  try {
    return await client.payments.refund(paymentId, {
      amount: amountPaise,
      speed: 'normal',
      notes: { source: 'gangaram-desk' },
    });
  } catch (err) {
    const description = err?.error?.description || err?.message || '';
    if (/fully refunded|already been refunded|already refunded/i.test(description)) {
      return { id: null, already: true };
    }
    const wrapped = new Error(description || 'Razorpay could not refund this payment');
    wrapped.statusCode = 502;
    throw wrapped;
  }
}
