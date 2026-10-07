import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.js';
import { refreshTokens, setAuthCookies } from '../services/auth.service.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import { ERROR_CODES } from '../constants/index.js';

async function userFromAccessToken(token) {
  const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, {
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
  });
  const user = await User.findById(decoded.sub).select('_id name email phone role isActive').lean();
  if (!user || !user.isActive) {
    throw new AuthenticationError('Account not found or deactivated', ERROR_CODES.UNAUTHORIZED);
  }
  return user;
}

/**
 * Verifies the access cookie. If it is missing or expired, rotates the refresh
 * cookie and continues. A forged access token is still rejected.
 */
export async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.accessToken;
    if (token) {
      try {
        req.user = await userFromAccessToken(token);
        return next();
      } catch (err) {
        if (err.name !== 'TokenExpiredError') {
          if (err instanceof AuthenticationError) throw err;
          throw new AuthenticationError('Invalid access token', ERROR_CODES.TOKEN_INVALID);
        }
      }
    }

    const rawRefresh = req.cookies?.refreshToken;
    if (!rawRefresh) {
      throw new AuthenticationError('Access token required', ERROR_CODES.UNAUTHORIZED);
    }

    const rotated = await refreshTokens(rawRefresh, req.headers['user-agent'] || null, req.ip);
    setAuthCookies(res, rotated.accessToken, rotated.refreshToken);
    req.user = await userFromAccessToken(rotated.accessToken);
    return next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication — attaches user if token present, continues without error if not.
 */
export async function optionalAuthenticate(req, _res, next) {
  try {
    const token = req.cookies?.accessToken;
    if (!token) return next();

    try {
      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, {
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
      });
      const user = await User.findById(decoded.sub).select('_id name email phone role isActive').lean();
      if (user && user.isActive) req.user = user;
    } catch {
      // ignore — optional auth
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based authorization factory.
 * Usage: authorize('admin') or authorize('admin', 'customer')
 */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }
    next();
  };
}
