import mongoose from 'mongoose';
import crypto from 'crypto';
import Order from '../models/Order.js';
import IdempotencyRecord from '../models/IdempotencyRecord.js';
import Product from '../models/Product.js';
import { clearCart } from './cart.service.js';
import { emailService } from './email.service.js';
import { serviceabilityService } from './serviceability.service.js';
import * as productRepo from '../repositories/product.repository.js';
import config from '../config/env.js';
import logger from '../config/logger.js';
import {
  BadRequestError,
  NotFoundError,
  InsufficientStockError,
  ConflictError,
  TransactionError,
} from '../utils/errors.js';
import {
  ERROR_CODES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  ORDER_STATUS_TRANSITIONS,
  CUSTOMER_CANCELLABLE_STATUSES,
  STOCK_RESTORE_STATUSES,
  DELIVERY_TYPE,
  PAYMENT_METHOD,
} from '../constants/index.js';
import { parsePagination } from '../utils/helpers.js';

/**
 * Generate a human-readable order number.
 * Format: GS-YYYYMMDD-XXXXX (e.g. GS-20241015-A3F2B)
 */
function generateOrderNumber() {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `GS-${datePart}-${randomPart}`;
}

/**
 * Calculate delivery charge in paise.
 */
function calculateDeliveryCharge(subtotalPaise, deliveryType) {
  if (deliveryType === DELIVERY_TYPE.PICKUP) return 0;
  if (subtotalPaise >= config.FREE_DELIVERY_ABOVE_PAISE) return 0;
  return config.DELIVERY_FEE_PAISE;
}

/**
 * Calculate GST in paise.
 */
function calculateTax(subtotalPaise) {
  if (!config.GST_RATE_PERCENT || config.GST_RATE_PERCENT === 0) return 0;
  return Math.round((subtotalPaise * config.GST_RATE_PERCENT) / 100);
}

// ─── CHECKOUT ───

/**
 * Checkout with full transactional safety:
 * 1. Idempotency check
 * 2. MongoDB transaction:
 *    a. Validate all cart items (product/variant active, stock sufficient)
 *    b. Atomically decrement stock for each item
 *    c. Create order with price snapshot
 *    d. Clear cart
 *    e. Mark idempotency record as COMPLETED
 * 3. Roll back everything on any failure
 */
export async function checkout(userId, checkoutData, idempotencyKey) {
  const { paymentMethod, deliveryType, shippingAddress, giftMessage, timeSlot, notes, items: requestedItems } = checkoutData;

  if (deliveryType !== DELIVERY_TYPE.PICKUP) {
    if (!shippingAddress?.addressLine1) {
      throw new BadRequestError('Delivery address is required', ERROR_CODES.INVALID_INPUT);
    }
    const canDeliver = await serviceabilityService.isServiceable(shippingAddress.pincode);
    if (!canDeliver) {
      throw new BadRequestError(
        'We do not deliver to this pincode yet. Choose store pickup, or use 848114, 851111, 851112, or 851113.',
        ERROR_CODES.ADDRESS_NOT_SERVICEABLE,
      );
    }
  }
  if (paymentMethod === PAYMENT_METHOD.ONLINE) {
    const { isPaymentsReady } = await import('../payments/razorpay.js');
    if (!isPaymentsReady()) {
      throw new BadRequestError('Online payment is not configured yet', ERROR_CODES.SERVICE_UNAVAILABLE);
    }
  }

  // ─── Idempotency check (outside transaction — fast reject) ───
  if (idempotencyKey) {
    const existing = await IdempotencyRecord.findOne({ key: idempotencyKey, userId }).lean();
    if (existing) {
      if (existing.status === 'COMPLETED' && existing.responseBody) {
        logger.info({ userId, idempotencyKey }, 'Returning cached idempotent response');
        return existing.responseBody;
      }
      if (existing.status === 'PROCESSING') {
        throw new ConflictError(
          'A checkout with this idempotency key is already in progress',
          ERROR_CODES.IDEMPOTENCY_CONFLICT,
        );
      }
    }
  }

  // ─── Create idempotency record (PROCESSING) ───
  let idempotencyRecord = null;
  if (idempotencyKey) {
    try {
      idempotencyRecord = await IdempotencyRecord.create({ key: idempotencyKey, userId, status: 'PROCESSING' });
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError('Duplicate idempotency key', ERROR_CODES.IDEMPOTENCY_CONFLICT);
      }
      throw err;
    }
  }

  // ─── Load lines from the website cart, or the saved server cart ───
  const { default: Cart } = await import('../models/Cart.js');
  let sourceItems = [];
  if (Array.isArray(requestedItems) && requestedItems.length > 0) {
    const keys = [...new Set(requestedItems.map((item) => item.productKey))];
    const products = await Product.find({ externalId: { $in: keys }, isActive: true }).lean();
    const byKey = new Map(products.map((product) => [product.externalId, product]));
    sourceItems = [];
    for (const item of requestedItems) {
      const product = byKey.get(item.productKey);
      if (!product) {
        if (idempotencyRecord) {
          await IdempotencyRecord.findByIdAndUpdate(idempotencyRecord._id, { status: 'FAILED' });
        }
        throw new NotFoundError(`Item ${item.productKey} is not available`, ERROR_CODES.PRODUCT_NOT_FOUND);
      }
      const variant = product.variants.find((entry) => entry.isActive) || product.variants[0];
      if (!variant) {
        if (idempotencyRecord) {
          await IdempotencyRecord.findByIdAndUpdate(idempotencyRecord._id, { status: 'FAILED' });
        }
        throw new NotFoundError(`Item ${item.productKey} is not available`, ERROR_CODES.VARIANT_NOT_FOUND);
      }
      sourceItems.push({
        productId: product._id,
        variantId: variant.variantId,
        quantity: item.quantity,
      });
    }
  } else {
    const cart = await Cart.findOne({ userId }).lean();
    if (!cart || cart.items.length === 0) {
      if (idempotencyRecord) await IdempotencyRecord.findByIdAndUpdate(idempotencyRecord._id, { status: 'FAILED' });
      throw new BadRequestError('Cart is empty', ERROR_CODES.CART_EMPTY);
    }
    sourceItems = cart.items;
  }

  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  const session = topology.setName ? await mongoose.startSession() : null;
  if (!session) {
    logger.warn('MongoDB is not a replica set, so this checkout is not wrapped in a transaction');
  }
  let order = null;

  try {
    const placeOrder = async () => {
      // ─── Step 1: Validate products and compute order items ───
      const orderItems = [];
      let subtotalPaise = 0;

      for (const cartItem of sourceItems) {
        // Fetch fresh product data inside transaction for consistency
        const productQuery = Product.findById(cartItem.productId);
        if (session) productQuery.session(session);
        const product = await productQuery.lean();

        if (!product) {
          throw new NotFoundError(
            `Product ${cartItem.productId} not found`,
            ERROR_CODES.PRODUCT_NOT_FOUND,
          );
        }
        if (!product.isActive) {
          throw new BadRequestError(
            `Product "${product.name}" is no longer available`,
            ERROR_CODES.PRODUCT_INACTIVE,
          );
        }

        const variant = product.variants.find((v) => v.variantId === cartItem.variantId);
        if (!variant) {
          throw new NotFoundError(
            `Variant ${cartItem.variantId} not found for product "${product.name}"`,
            ERROR_CODES.VARIANT_NOT_FOUND,
          );
        }
        if (!variant.isActive) {
          throw new BadRequestError(
            `Variant "${variant.name}" of "${product.name}" is not available`,
            ERROR_CODES.VARIANT_INACTIVE,
          );
        }

        // ─── Step 2: Atomic stock decrement ───
        const updated = await productRepo.decrementStockAtomic(
          session,
          cartItem.productId,
          cartItem.variantId,
          cartItem.quantity,
        );

        if (!updated) {
          throw new InsufficientStockError(
            `Insufficient stock for "${product.name}" (${variant.name}). Available: ${variant.stock}`,
            { productName: product.name, variantName: variant.name, available: variant.stock },
          );
        }

        // ─── Step 3: Snapshot item with current DB price (never trust client) ───
        const unitPricePaise = variant.pricePaise;
        const itemSubtotal = unitPricePaise * cartItem.quantity;
        subtotalPaise += itemSubtotal;

        orderItems.push({
          productId: cartItem.productId,
          variantId: cartItem.variantId,
          productName: product.name,
          variantName: variant.name,
          quantity: cartItem.quantity,
          unitPricePaise,
          subtotalPaise: itemSubtotal,
        });
      }

      // ─── Step 4: Compute pricing server-side ───
      const deliveryChargePaise = calculateDeliveryCharge(subtotalPaise, deliveryType);
      const taxPaise = calculateTax(subtotalPaise);
      const discountPaise = 0; // extend here for coupon/promo system
      const totalPaise = subtotalPaise + deliveryChargePaise + taxPaise - discountPaise;

      if (totalPaise < config.MIN_ORDER_AMOUNT_PAISE) {
        throw new BadRequestError(
          `Minimum order amount is ₹${(config.MIN_ORDER_AMOUNT_PAISE / 100).toFixed(0)}`,
          ERROR_CODES.INVALID_INPUT,
        );
      }

      // ─── Step 5: Create the order ───
      const orderNumber = generateOrderNumber();
      [order] = await Order.create(
        [
          {
            orderNumber,
            user: userId,
            items: orderItems,
            shippingAddress: deliveryType === DELIVERY_TYPE.PICKUP ? null : shippingAddress,
            deliveryType,
            subtotalPaise,
            deliveryChargePaise,
            taxPaise,
            discountPaise,
            totalPaise,
            orderStatus: paymentMethod === PAYMENT_METHOD.ONLINE
              ? ORDER_STATUS.PENDING_PAYMENT
              : ORDER_STATUS.PLACED,
            paymentStatus: PAYMENT_STATUS.PENDING,
            paymentMethod,
            giftMessage: giftMessage || null,
            timeSlot: timeSlot || 'anytime',
            notes: notes || null,
            idempotencyKey: idempotencyKey || null,
            statusHistory: [
              {
                status: paymentMethod === PAYMENT_METHOD.ONLINE
                  ? ORDER_STATUS.PENDING_PAYMENT
                  : ORDER_STATUS.PLACED,
                note: paymentMethod === PAYMENT_METHOD.ONLINE
                  ? 'Awaiting online payment'
                  : 'Order placed by customer',
                changedBy: userId,
                timestamp: new Date(),
              },
            ],
          },
        ],
        session ? { session } : undefined,
      );

      // ─── Step 6: Clear cart ───
      await clearCart(userId, session);
    };

    if (session) await session.withTransaction(placeOrder);
    else await placeOrder();

    // ─── Mark idempotency record COMPLETED (outside transaction) ───
    const responseBody = {
      orderNumber: order.orderNumber,
      orderId: order._id,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalPaise: order.totalPaise,
      subtotalPaise: order.subtotalPaise,
      deliveryChargePaise: order.deliveryChargePaise,
      taxPaise: order.taxPaise,
      itemCount: order.items.length,
    };

    if (idempotencyRecord) {
      await IdempotencyRecord.findByIdAndUpdate(idempotencyRecord._id, {
        status: 'COMPLETED',
        responseBody,
        orderId: order._id,
      });
    }

    logger.info(
      { userId, orderId: order._id, orderNumber: order.orderNumber, totalPaise: order.totalPaise },
      'Order created successfully',
    );

    if (paymentMethod !== PAYMENT_METHOD.ONLINE) {
      const { default: User } = await import('../models/User.js');
      User.findById(userId).lean().then((user) => {
        if (user) {
          emailService.sendOrderConfirmationEmail(
            user.email,
            order.orderNumber,
            user.name,
            order.totalPaise,
          ).catch((err) => logger.warn({ err }, 'Failed to send order confirmation email'));
        }
      });
    }

    return {
      ...responseBody,
      orderId: String(order._id),
    };
  } catch (err) {
    // Mark idempotency record FAILED
    if (idempotencyRecord) {
      await IdempotencyRecord.findByIdAndUpdate(idempotencyRecord._id, { status: 'FAILED' }).catch(
        () => {},
      );
    }

    if (
      err instanceof BadRequestError ||
      err instanceof NotFoundError ||
      err instanceof InsufficientStockError ||
      err instanceof ConflictError
    ) {
      throw err;
    }

    logger.error({ err, userId }, 'Checkout transaction failed');
    throw new TransactionError('Checkout failed. Please try again.');
  } finally {
    if (session) await session.endSession();
  }
}

export async function markOrderPaid({ orderId, amountPaise, razorpayOrderId, paymentId, method }) {
  const updated = await Order.updateOne(
    {
      _id: orderId,
      totalPaise: amountPaise,
      orderStatus: ORDER_STATUS.PENDING_PAYMENT,
      paymentStatus: PAYMENT_STATUS.PENDING,
    },
    {
      $set: {
        paymentStatus: PAYMENT_STATUS.PAID,
        orderStatus: ORDER_STATUS.CONFIRMED,
        'payment.provider': 'razorpay',
        'payment.providerOrderId': razorpayOrderId,
        'payment.providerPaymentId': paymentId,
        'payment.metadata': { method },
      },
      $push: {
        statusHistory: {
          status: ORDER_STATUS.CONFIRMED,
          note: 'Payment captured',
          timestamp: new Date(),
        },
      },
    },
  );
  if (updated.modifiedCount === 1) {
    const paid = await Order.findById(orderId).populate('user', 'email name').lean();
    if (paid?.user?.email) {
      emailService.sendOrderConfirmationEmail(
        paid.user.email,
        paid.orderNumber,
        paid.user.name,
        paid.totalPaise,
      ).catch((err) => logger.warn({ err }, 'Failed to send paid-order email'));
    }
    return 'applied';
  }

  const existing = await Order.findById(orderId).select('payment.providerPaymentId paymentStatus').lean();
  if (existing?.payment?.providerPaymentId === paymentId && existing.paymentStatus === PAYMENT_STATUS.PAID) {
    return 'already';
  }
  return 'rejected';
}

export async function markOrderRefunded({ orderId, paymentId }) {
  const order = await Order.findOne({
    _id: orderId,
    'payment.providerPaymentId': paymentId,
  });
  if (!order || order.orderStatus === ORDER_STATUS.CANCELLED) return;
  order.paymentStatus = PAYMENT_STATUS.REFUNDED;
  await order.save();
  await performCancellation(order.toObject(), null, 'Payment refunded');
}

// ─── Customer Order Queries ───

export async function getCustomerOrders(userId, query) {
  const { page, limit, skip } = parsePagination(query, 50);
  const filter = { user: userId };
  if (query.status) filter.orderStatus = query.status;

  const [rows, total] = await Promise.all([
    Order.find(filter)
      .select('orderNumber orderStatus paymentStatus paymentMethod totalPaise createdAt deliveryType items.productName items.quantity')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  const orders = rows.map((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    return {
      _id: order._id,
      orderNumber: order.orderNumber || null,
      orderStatus: order.orderStatus || null,
      paymentStatus: order.paymentStatus || null,
      paymentMethod: order.paymentMethod || null,
      totalPaise: Number.isFinite(order.totalPaise) ? order.totalPaise : null,
      createdAt: order.createdAt || null,
      deliveryType: order.deliveryType || null,
      itemCount: items.length,
      items: items.map((item) => ({
        productName: item?.productName || 'Item',
        quantity: Number.isInteger(item?.quantity) && item.quantity > 0 ? item.quantity : 1,
      })),
    };
  });

  return { orders, total, page, limit };
}

function phoneTail(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

export async function trackOrder(orderNumber, phone) {
  const number = String(orderNumber || '').trim().toUpperCase();
  const given = phoneTail(phone);
  const order = await Order.findOne({ orderNumber: number })
    .populate('user', 'phone')
    .select('orderNumber orderStatus paymentStatus paymentMethod deliveryType totalPaise createdAt statusHistory items.productName items.quantity shippingAddress.phone user')
    .lean();

  const matches = [order?.user?.phone, order?.shippingAddress?.phone].some((value) => phoneTail(value) === given);
  if (!order || !given || !matches) {
    throw new NotFoundError(
      'We could not find an order with that ID and phone number',
      ERROR_CODES.ORDER_NOT_FOUND,
    );
  }

  return {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    deliveryType: order.deliveryType,
    totalPaise: order.totalPaise,
    createdAt: order.createdAt,
    items: (order.items || []).map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
    })),
    history: (order.statusHistory || []).map((entry) => ({
      status: entry.status,
      timestamp: entry.timestamp,
    })),
  };
}

export async function getCustomerOrderById(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId }).lean();
  if (!order) throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
  return order;
}

/**
 * Cancel an order with atomic stock restoration.
 * Uses stockRestored flag to guarantee stock is restored exactly once.
 */
export async function cancelOrder(userId, orderId, reason) {
  const order = await Order.findOne({ _id: orderId, user: userId }).lean();
  if (!order) throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);

  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.orderStatus)) {
    throw new BadRequestError(
      `Order cannot be cancelled in status: ${order.orderStatus}`,
      ERROR_CODES.ORDER_CANNOT_BE_CANCELLED,
    );
  }

  if (order.orderStatus === ORDER_STATUS.CANCELLED) {
    throw new BadRequestError('Order is already cancelled', ERROR_CODES.ORDER_CANNOT_BE_CANCELLED);
  }

  return performCancellation(order, userId, reason);
}

// ─── Admin Order Operations ───

export async function getAdminOrders(query) {
  const { page, limit, skip } = parsePagination(query, 100);
  const filter = {};

  if (query.status) filter.orderStatus = query.status;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  if (query.userId) filter.user = query.userId;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return { orders, total, page, limit };
}

export async function getAdminOrderById(orderId) {
  const order = await Order.findById(orderId).populate('user', 'name email phone').lean();
  if (!order) throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
  return order;
}

export async function updateOrderStatus(orderId, newStatus, adminId, note) {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);

  const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.orderStatus];
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    throw new BadRequestError(
      `Cannot move this order from ${order.orderStatus} to ${newStatus}`,
      ERROR_CODES.INVALID_ORDER_TRANSITION,
    );
  }

  if (newStatus === ORDER_STATUS.CANCELLED) {
    return performCancellation(order.toObject(), adminId, note, true);
  }

  order.orderStatus = newStatus;
  order.statusHistory.push({
    status: newStatus,
    note: note || null,
    changedBy: adminId,
    timestamp: new Date(),
  });
  await order.save();

  logger.info({ orderId, newStatus, adminId }, 'Order status updated by admin');

  // Notify customer (non-blocking)
  Order.findById(orderId).populate('user', 'email name').lean().then((o) => {
    if (o && o.user) {
      emailService.sendOrderStatusUpdateEmail(
        o.user.email,
        o.orderNumber,
        newStatus,
        o.user.name,
      ).catch((e) => logger.warn({ e }, 'Failed to send status update email'));
    }
  });

  return order;
}

export async function adminCancelOrder(orderId, adminId, reason) {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
  return performCancellation(order.toObject(), adminId, reason || 'Cancelled by shop', true);
}

export async function adminRefundOrder(orderId, adminId) {
  const order = await Order.findById(orderId);
  if (!order) throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);
  if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) {
    throw new BadRequestError('This order is already refunded', ERROR_CODES.INVALID_INPUT);
  }
  if (order.paymentMethod !== PAYMENT_METHOD.ONLINE || order.paymentStatus !== PAYMENT_STATUS.PAID) {
    throw new BadRequestError(
      'Only a paid online order can be refunded. Cash orders are settled by hand.',
      ERROR_CODES.INVALID_INPUT,
    );
  }
  const paymentId = order.payment?.providerPaymentId;
  if (!paymentId) {
    throw new BadRequestError('This order has no Razorpay payment to refund', ERROR_CODES.INVALID_INPUT);
  }

  const { refundCapturedPayment } = await import('../payments/razorpay.js');
  let refund;
  try {
    refund = await refundCapturedPayment(paymentId, order.totalPaise);
  } catch (err) {
    throw new BadRequestError(err.message || 'Refund failed', ERROR_CODES.SERVICE_UNAVAILABLE);
  }

  if (order.orderStatus !== ORDER_STATUS.CANCELLED) {
    try {
      await performCancellation(order.toObject(), adminId, 'Cancelled and refunded by shop', true);
    } catch (err) {
      logger.error({ err, orderId }, 'Refund succeeded but cancellation did not finish');
    }
  }

  await Order.updateOne(
    { _id: orderId },
    {
      $set: {
        paymentStatus: PAYMENT_STATUS.REFUNDED,
        'payment.metadata.refundId': refund?.id || null,
      },
    },
  );

  logger.info({ orderId, adminId, paymentId }, 'Order refunded by admin');
  return Order.findById(orderId).populate('user', 'name email phone').lean();
}

// ─── Internal: perform cancellation with stock restoration ───

async function performCancellation(order, actorId, reason, isAdmin = false) {
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  const session = topology.setName ? await mongoose.startSession() : null;

  try {
    let updatedOrder;
    const cancel = async () => {
      const freshQuery = Order.findById(order._id);
      if (session) freshQuery.session(session);
      const freshOrder = await freshQuery;
      if (!freshOrder) throw new NotFoundError('Order not found', ERROR_CODES.ORDER_NOT_FOUND);

      if (freshOrder.orderStatus === ORDER_STATUS.CANCELLED) {
        throw new BadRequestError('Order is already cancelled', ERROR_CODES.ORDER_CANNOT_BE_CANCELLED);
      }

      // Restore stock only if not already restored (prevents double-restoration)
      if (!freshOrder.stockRestored && STOCK_RESTORE_STATUSES.includes(freshOrder.orderStatus)) {
        for (const item of freshOrder.items) {
          await productRepo.incrementStockAtomic(
            session,
            item.productId,
            item.variantId,
            item.quantity,
          );
        }
        freshOrder.stockRestored = true;
      }

      freshOrder.orderStatus = ORDER_STATUS.CANCELLED;
      freshOrder.statusHistory.push({
        status: ORDER_STATUS.CANCELLED,
        note: reason || (isAdmin ? 'Cancelled by admin' : 'Cancelled by customer'),
        changedBy: actorId,
        timestamp: new Date(),
      });

      await freshOrder.save(session ? { session } : undefined);
      updatedOrder = freshOrder;
    };
    if (session) await session.withTransaction(cancel);
    else await cancel();

    logger.info(
      { orderId: order._id, actorId, isAdmin },
      'Order cancelled and stock restored',
    );

    return updatedOrder;
  } catch (err) {
    if (
      err instanceof BadRequestError ||
      err instanceof NotFoundError
    ) {
      throw err;
    }
    logger.error({ err, orderId: order._id }, 'Cancellation transaction failed');
    throw new TransactionError('Cancellation failed. Please try again.');
  } finally {
    if (session) await session.endSession();
  }
}
