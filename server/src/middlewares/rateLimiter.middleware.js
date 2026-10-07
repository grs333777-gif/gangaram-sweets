import rateLimit from 'express-rate-limit';
import config from '../config/env.js';
import { ERROR_CODES } from '../constants/index.js';

function makeHandler(windowMs, max, _prefix, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: ERROR_CODES.TOO_MANY_REQUESTS,
          message,
        },
      });
    },
    skip: (req) => config.NODE_ENV === 'test' && req.headers['x-skip-rate-limit'] === 'true',
  });
}

export const globalRateLimit = makeHandler(
  config.RATE_LIMIT_WINDOW_MS,
  config.RATE_LIMIT_MAX,
  'global',
  'Too many requests. Please slow down.',
);

export const authRateLimit = makeHandler(
  config.AUTH_RATE_LIMIT_WINDOW_MS,
  config.AUTH_RATE_LIMIT_MAX,
  'auth',
  'Too many authentication attempts. Please try again later.',
);

export const locationRateLimit = makeHandler(
  15 * 60 * 1000,
  20,
  'location',
  'Too many location checks. Please wait and try again.',
);

export const trackRateLimit = makeHandler(
  15 * 60 * 1000,
  30,
  'track',
  'Too many tracking attempts. Please wait and try again.',
);

export const checkoutRateLimit = makeHandler(
  config.CHECKOUT_RATE_LIMIT_WINDOW_MS,
  config.CHECKOUT_RATE_LIMIT_MAX,
  'checkout',
  'Too many checkout attempts. Please wait before trying again.',
);
