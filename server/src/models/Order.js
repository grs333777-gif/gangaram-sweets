import mongoose from 'mongoose';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  DELIVERY_TYPE,
} from '../constants/index.js';

// Snapshot of the shipping address at order time — immutable
const shippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    landmark: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String, default: 'India' },
  },
  { _id: false },
);

// Snapshot of each item at time of purchase — price changes cannot affect history
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: { type: String, required: true },
    productName: { type: String, required: true },
    variantName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPricePaise: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'unitPricePaise must be integer' },
    },
    subtotalPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'subtotalPaise must be integer' },
    },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      required: true,
    },
    note: { type: String, default: null },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    shippingAddress: shippingAddressSchema,
    deliveryType: {
      type: String,
      enum: Object.values(DELIVERY_TYPE),
      default: DELIVERY_TYPE.DELIVERY,
    },

    // All amounts in paise (integer)
    subtotalPaise: { type: Number, required: true, min: 0 },
    deliveryChargePaise: { type: Number, required: true, min: 0, default: 0 },
    taxPaise: { type: Number, required: true, min: 0, default: 0 },
    discountPaise: { type: Number, required: true, min: 0, default: 0 },
    totalPaise: { type: Number, required: true, min: 0 },

    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PLACED,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      required: true,
    },

    // Payment abstraction — filled when payment gateway is integrated
    payment: {
      provider: { type: String, default: null },
      providerOrderId: { type: String, default: null },
      providerPaymentId: { type: String, default: null },
      providerSignature: { type: String, default: null },
      metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    statusHistory: [statusHistorySchema],

    // Idempotency
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },

    // Stock already restored (prevents double-restoration on cancel)
    stockRestored: { type: Boolean, default: false },

    // Optional fields from checkout
    giftMessage: { type: String, maxlength: 500, default: null },
    timeSlot: { type: String, default: null },
    notes: { type: String, maxlength: 500, default: null },
  },
  {
    timestamps: true,
  },
);

// ─── Compound indexes for common admin/customer queries ───
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
