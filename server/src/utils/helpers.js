/**
 * Wraps async route handlers to automatically catch errors
 * and pass them to Express error middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Consistent success response shape.
 */
export function successResponse(res, data, statusCode = 200, meta = null) {
  const payload = {
    success: true,
    data,
  };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

/**
 * Paginated response helper.
 */
export function paginatedResponse(res, data, { page, limit, total }) {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
}

/**
 * Parse and clamp pagination parameters safely.
 */
export function parsePagination(query, maxLimit = 50) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Generate a URL-friendly slug from a string.
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Convert rupees to paise (integer). Guards against floating point issues.
 */
export function rupeesToPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

/**
 * Convert paise to rupees for display.
 */
export function paiseToRupees(paise) {
  return (paise / 100).toFixed(2);
}
