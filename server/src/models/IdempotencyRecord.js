import mongoose from 'mongoose';

/**
 * Idempotency record for checkout operations.
 * Prevents duplicate orders from retries/double-clicks.
 * Uses a unique index on key + userId to scope keys per user.
 */
const idempotencySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PROCESSING',
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    expiresAt: {
      type: Date,
      // Auto-expire records after 24 hours
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  },
);

idempotencySchema.index({ key: 1, userId: 1 }, { unique: true });
idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const IdempotencyRecord = mongoose.model('IdempotencyRecord', idempotencySchema);
export default IdempotencyRecord;
