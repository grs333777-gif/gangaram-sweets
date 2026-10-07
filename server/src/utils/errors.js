import { ERROR_CODES } from '../constants/index.js';

export class AppError extends Error {
  constructor(message, statusCode, code = ERROR_CODES.INTERNAL_ERROR, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 422, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = ERROR_CODES.UNAUTHORIZED) {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, ERROR_CODES.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = ERROR_CODES.NOT_FOUND) {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message, code = ERROR_CODES.CONFLICT) {
    super(message, 409, code);
  }
}

export class BadRequestError extends AppError {
  constructor(message, code = ERROR_CODES.INVALID_INPUT) {
    super(message, 400, code);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, ERROR_CODES.TOO_MANY_REQUESTS);
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = 'Insufficient stock', details = null) {
    super(message, 409, ERROR_CODES.INSUFFICIENT_STOCK, details);
  }
}

export class TransactionError extends AppError {
  constructor(message = 'Transaction failed') {
    super(message, 500, ERROR_CODES.INTERNAL_ERROR);
  }
}
