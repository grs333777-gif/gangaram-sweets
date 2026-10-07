import { ZodError } from 'zod';

/**
 * Middleware factory to validate request body against a Zod schema.
 * Throws ZodError which the central error handler processes.
 */
export function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validate query params against a Zod schema.
 */
export function validateQuery(schema) {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse({ ...req.query });
      // Express 5 exposes req.query as a getter, so assignment throws.
      Object.defineProperty(req, 'query', {
        value: parsed,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError && Array.isArray(err.errors)) {
        err.errors = err.errors.map((e) => ({ ...e, path: ['query', ...(e.path || [])] }));
      }
      next(err);
    }
  };
}

/**
 * Validate params against a Zod schema.
 */
export function validateParams(schema) {
  return (req, _res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      next(err);
    }
  };
}
