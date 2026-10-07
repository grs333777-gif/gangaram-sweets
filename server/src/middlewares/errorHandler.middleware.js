import { ZodError } from 'zod';
import mongoose from 'mongoose';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { AppError } from '../utils/errors.js';
import { ERROR_CODES } from '../constants/index.js';

/**
 * Centralized error handler — always returns a consistent JSON shape.
 * Never exposes internal details (stack, MongoDB errors) in production.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const requestId = req.id;
  const isProd = config.NODE_ENV === 'production';

  // ─── Zod Validation Error ───
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    logger.warn({ requestId, details }, 'Validation error');
    return res.status(422).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        requestId,
        details,
      },
    });
  }

  // ─── Operational AppError ───
  if (err instanceof AppError && err.isOperational) {
    if (err.statusCode >= 500) {
      logger.error({ requestId, err }, 'Operational server error');
    } else {
      logger.warn({ requestId, code: err.code, message: err.message }, 'Operational error');
    }
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.details && !isProd ? { details: err.details } : {}),
      },
    });
  }

  // ─── MongoDB Duplicate Key Error ───
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    logger.warn({ requestId, field }, 'Duplicate key error');
    return res.status(409).json({
      success: false,
      error: {
        code:
          field === 'email'
            ? ERROR_CODES.EMAIL_ALREADY_EXISTS
            : field === 'phone'
              ? ERROR_CODES.PHONE_ALREADY_EXISTS
              : ERROR_CODES.CONFLICT,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already in use`,
        requestId,
      },
    });
  }

  // ─── MongoDB CastError (invalid ObjectId etc.) ───
  if (err instanceof mongoose.Error.CastError) {
    logger.warn({ requestId, path: err.path }, 'Cast error');
    return res.status(400).json({
      success: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: `Invalid value for field: ${err.path}`,
        requestId,
      },
    });
  }

  // ─── MongoDB ValidationError ───
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    logger.warn({ requestId, details }, 'Mongoose validation error');
    return res.status(422).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        requestId,
        details,
      },
    });
  }

  // ─── Unexpected error ───
  logger.error({ requestId, err }, 'Unexpected error');
  return res.status(500).json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      requestId,
      ...(isProd ? {} : { detail: err.message }),
    },
  });
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      requestId: req.id,
    },
  });
}
