import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { ROLES } from '../constants/index.js';

const BCRYPT_SALT_ROUNDS = 12;

const addressSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true },
    addressLine1: { type: String, trim: true, maxlength: 255 },
    addressLine2: { type: String, trim: true, maxlength: 255 },
    landmark: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    pincode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    lookupHash: { type: String, index: true },
    family: { type: String, required: true }, // used for reuse detection
    deviceInfo: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // never returned by default
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },

    // Addresses sub-document array
    addresses: [addressSchema],

    // Refresh token storage (multiple devices)
    refreshTokens: [refreshTokenSchema],

    // Password reset
    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpiresAt: { type: Date, select: false, default: null },

    // Login security
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, default: null, select: false },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.failedLoginAttempts;
        delete ret.lockedUntil;
        return ret;
      },
    },
  },
);

// ─── Methods ───

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > new Date();
};

userSchema.methods.incrementFailedAttempts = async function (maxAttempts, lockDurationMs) {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= maxAttempts) {
    this.lockedUntil = new Date(Date.now() + lockDurationMs);
    this.failedLoginAttempts = 0;
  }
  await this.save();
};

userSchema.methods.resetFailedAttempts = async function () {
  if (this.failedLoginAttempts !== 0 || this.lockedUntil) {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    await this.save();
  }
};

// ─── Statics ───

userSchema.statics.hashPassword = async function (plain) {
  return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
};

// ─── Pre-save hook ───
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
  }
  next();
});

const User = mongoose.model('User', userSchema);
export default User;
