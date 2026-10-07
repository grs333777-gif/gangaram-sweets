import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import config from '../config/env.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../utils/errors.js';
import { ERROR_CODES, ROLES } from '../constants/index.js';
import { emailService } from './email.service.js';

const REFRESH_BCRYPT_ROUNDS = 10;
const ACCESS_COOKIE_NAME = 'accessToken';
const REFRESH_COOKIE_NAME = 'refreshToken';

// ─── Token Generation ───

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    config.JWT_ACCESS_SECRET,
    {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    },
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

async function hashToken(token) {
  return bcrypt.hash(token, REFRESH_BCRYPT_ROUNDS);
}

async function compareTokenHash(token, hash) {
  return bcrypt.compare(token, hash);
}

function generateFamily() {
  return crypto.randomBytes(16).toString('hex');
}

function refreshTokenExpiryDate() {
  const ms = parseExpiryToMs(config.JWT_REFRESH_EXPIRES_IN);
  return new Date(Date.now() + ms);
}

function parseExpiryToMs(expiry) {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const [, amount, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(amount, 10) * multipliers[unit];
}

// ─── Cookie helpers ───

export function setAuthCookies(res, accessToken, refreshToken) {
  const isProduction = config.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: config.COOKIE_SECURE || isProduction,
    sameSite: config.COOKIE_SAMESITE,
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  };

  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...cookieOptions,
    maxAge: parseExpiryToMs(config.JWT_ACCESS_EXPIRES_IN),
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...cookieOptions,
    maxAge: parseExpiryToMs(config.JWT_REFRESH_EXPIRES_IN),
    path: '/api',
  });
}

export function clearAuthCookies(res) {
  const cookieOptions = {
    httpOnly: true,
    secure: config.COOKIE_SECURE || config.NODE_ENV === 'production',
    sameSite: config.COOKIE_SAMESITE,
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  };
  res.clearCookie(ACCESS_COOKIE_NAME, cookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, { ...cookieOptions, path: '/api' });
  res.clearCookie(REFRESH_COOKIE_NAME, { ...cookieOptions, path: '/api/auth' });
}

// ─── Service Methods ───

export async function signup({ name, email, phone, password }) {
  // Normalize phone to +91 format
  const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone.slice(-10)}`;

  const existing = await User.findOne({ $or: [{ email }, { phone: normalizedPhone }] }).lean();
  if (existing) {
    if (existing.email === email) {
      throw new ConflictError('Email already registered', ERROR_CODES.EMAIL_ALREADY_EXISTS);
    }
    throw new ConflictError('Phone already registered', ERROR_CODES.PHONE_ALREADY_EXISTS);
  }

  const user = new User({ name, email, phone: normalizedPhone, password });
  await user.save();

  logger.info({ userId: user._id, email: user.email }, 'User registered');
  return user;
}

export async function login({ email, phone, password, deviceInfo, ip }) {
  const lockDurationMs =
    config.ACCOUNT_LOCK_DURATION_MINUTES * 60 * 1000;

  // Find user by email or phone — select sensitive auth fields
  const query = email ? { email } : { phone: phone.startsWith('+91') ? phone : `+91${phone.slice(-10)}` };
  const user = await User.findOne(query).select(
    '+password +failedLoginAttempts +lockedUntil +refreshTokens',
  );

  // Constant-time-ish: use generic error to prevent user enumeration
  if (!user || !user.isActive) {
    // Still hash to prevent timing attacks
    await bcrypt.hash(password, 10);
    throw new AuthenticationError('Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (user.isLocked()) {
    const remainingMs = user.lockedUntil - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    logger.warn({ userId: user._id }, 'Login attempt on locked account');
    throw new AuthenticationError(
      `Account locked. Try again in ${remainingMin} minute(s).`,
      ERROR_CODES.ACCOUNT_LOCKED,
    );
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    await user.incrementFailedAttempts(
      config.MAX_FAILED_LOGIN_ATTEMPTS,
      lockDurationMs,
    );
    logger.warn({ userId: user._id, ip }, 'Failed login attempt');
    throw new AuthenticationError('Invalid credentials', ERROR_CODES.INVALID_CREDENTIALS);
  }

  await user.resetFailedAttempts();

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = await hashToken(rawRefreshToken);
  const family = generateFamily();

  // Prune expired refresh tokens and add new one
  const now = new Date();
  user.refreshTokens = (user.refreshTokens || []).filter(
    (t) => t.expiresAt > now && !t.isRevoked,
  );
  user.refreshTokens.push({
    tokenHash,
    lookupHash: crypto.createHash('sha256').update(rawRefreshToken).digest('hex'),
    family,
    deviceInfo: deviceInfo || null,
    expiresAt: refreshTokenExpiryDate(),
  });

  user.lastLoginAt = now;
  user.lastLoginIp = ip || null;
  await user.save();

  logger.info({ userId: user._id, ip }, 'User logged in');
  return { accessToken, refreshToken: rawRefreshToken, user };
}

export async function refreshTokens(rawRefreshToken, deviceInfo, ip) {
  if (!rawRefreshToken) {
    throw new AuthenticationError('Refresh token required', ERROR_CODES.REFRESH_TOKEN_INVALID);
  }

  // We must search all users' refresh tokens — indexed on userId, not by token hash
  // Strategy: decode a hint from the token or brute-force search within a session window.
  // For efficiency: find by recent users. This is acceptable since refresh tokens are long-lived
  // and stored in users' documents. In production with millions of users, consider a separate
  // RefreshToken collection indexed by tokenHash.
  //
  // For now: We pass the userId embedded in a signed JWT part of the refresh token combo.
  // Assumption: the refresh token is accompanied by a short-lived access token hint, but
  // since access token may be expired, we decode without verify to get the user id hint.
  //
  // Safer approach used here: store userId in a separate non-httpOnly cookie or as the cookie
  // name prefix. We use a signed reference: we'll search users with non-expired tokens and
  // compare hashes. To keep this performant, we use a salt/prefix stored alongside.
  //
  // Practical implementation: compare against all non-expired non-revoked tokens.
  // For a large app, move refresh tokens to their own collection.

  const now = new Date();
  const lookupHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  let matchedUser = await User.findOne({
    'refreshTokens.lookupHash': lookupHash,
    'refreshTokens.expiresAt': { $gt: now },
    'refreshTokens.isRevoked': false,
  }).select('+refreshTokens');

  let matchedToken = null;
  if (matchedUser) {
    for (const storedToken of matchedUser.refreshTokens) {
      if (storedToken.lookupHash !== lookupHash || storedToken.isRevoked || storedToken.expiresAt <= now) continue;
      if (await compareTokenHash(rawRefreshToken, storedToken.tokenHash)) {
        matchedToken = storedToken;
        break;
      }
    }
  }

  if (!matchedUser || !matchedToken) {
    throw new AuthenticationError('Invalid refresh token', ERROR_CODES.REFRESH_TOKEN_INVALID);
  }

  // ─── Reuse Detection ───
  // If this token was already revoked (but found somehow), revoke entire family
  if (matchedToken.isRevoked) {
    logger.warn(
      { userId: matchedUser._id, family: matchedToken.family },
      'Refresh token reuse detected — revoking session family',
    );
    // Revoke all tokens in this family
    matchedUser.refreshTokens = matchedUser.refreshTokens.map((t) =>
      t.family === matchedToken.family ? { ...t.toObject(), isRevoked: true } : t,
    );
    await matchedUser.save();
    throw new AuthenticationError('Token reuse detected', ERROR_CODES.TOKEN_REUSE_DETECTED);
  }

  // ─── Rotate: revoke old, issue new ───
  const familyId = matchedToken.family;

  // Mark old token as revoked
  matchedToken.isRevoked = true;

  // Generate new tokens
  const newAccessToken = generateAccessToken(matchedUser);
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = await hashToken(newRawRefreshToken);

  matchedUser.refreshTokens.push({
    tokenHash: newTokenHash,
    lookupHash: crypto.createHash('sha256').update(newRawRefreshToken).digest('hex'),
    family: familyId, // same family for reuse detection
    deviceInfo: deviceInfo || matchedToken.deviceInfo,
    expiresAt: refreshTokenExpiryDate(),
  });

  // Prune expired / revoked tokens (keep array manageable)
  matchedUser.refreshTokens = matchedUser.refreshTokens.filter(
    (t) => t.expiresAt > now && !t.isRevoked,
  );
  // Re-add the just-revoked token for reuse detection window (keep for 5 min)
  matchedToken.expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  matchedUser.refreshTokens.push(matchedToken);

  matchedUser.lastLoginAt = now;
  matchedUser.lastLoginIp = ip || null;
  await matchedUser.save();

  logger.info({ userId: matchedUser._id }, 'Refresh token rotated');
  return { accessToken: newAccessToken, refreshToken: newRawRefreshToken };
}

export async function logout(userId, rawRefreshToken) {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;

  if (rawRefreshToken) {
    // Revoke just the current session token
    for (const token of user.refreshTokens) {
      if (token.isRevoked) continue;
      const isMatch = await compareTokenHash(rawRefreshToken, token.tokenHash);
      if (isMatch) {
        token.isRevoked = true;
        break;
      }
    }
  }

  await user.save();
  logger.info({ userId }, 'User logged out');
}

export async function logoutAll(userId) {
  await User.findByIdAndUpdate(userId, {
    $set: { refreshTokens: [] },
  });
  logger.info({ userId }, 'All sessions revoked');
}

export async function forgotPassword({ email, phone }) {
  const query = email ? { email } : { phone: phone.startsWith('+91') ? phone : `+91${phone.slice(-10)}` };
  const user = await User.findOne(query).select('+passwordResetTokenHash +passwordResetExpiresAt');

  // Always return success to avoid user enumeration
  if (!user || !user.isActive) {
    logger.info({ query }, 'Password reset requested for non-existent account');
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date(Date.now() + config.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);

  user.passwordResetTokenHash = resetTokenHash;
  user.passwordResetExpiresAt = expiresAt;
  await user.save();

  // Send email via the email service stub
  await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);

  logger.info({ userId: user._id }, 'Password reset token generated');
}

export async function resetPassword({ token, password }) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt +refreshTokens');

  if (!user) {
    throw new BadRequestError('Invalid or expired reset token', ERROR_CODES.TOKEN_INVALID);
  }

  // Update password, clear reset token, revoke all sessions for security
  user.password = password; // pre-save hook will hash
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.refreshTokens = []; // force re-login on all devices
  await user.save();

  logger.info({ userId: user._id }, 'Password reset successful');
}

export async function getProfile(userId) {
  const user = await User.findById(userId).select('-refreshTokens').lean();
  if (!user) throw new NotFoundError('User not found');
  return user;
}

/**
 * Email verification interface stub.
 * Plug in actual provider (SendGrid, SES, etc.) here.
 */
export const verificationService = {
  async sendEmailVerification(userId) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    // TODO: generate email OTP/link and send via emailService
    logger.info({ userId }, '[STUB] Email verification sent');
  },

  async verifyEmail(userId, _otp) {
    await User.findByIdAndUpdate(userId, { isEmailVerified: true });
    logger.info({ userId }, 'Email verified');
  },

  async sendPhoneVerification(userId) {
    logger.info({ userId }, '[STUB] Phone verification OTP sent');
  },

  async verifyPhone(userId, _otp) {
    await User.findByIdAndUpdate(userId, { isPhoneVerified: true });
    logger.info({ userId }, 'Phone verified');
  },
};

export { ROLES };
