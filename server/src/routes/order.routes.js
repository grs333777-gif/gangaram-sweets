import { Router } from 'express';
import mongoose from 'mongoose';
import { createRequire } from 'module';
import * as orderController from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateBody, validateQuery } from '../middlewares/validate.middleware.js';
import { checkoutRateLimit, locationRateLimit, trackRateLimit } from '../middlewares/rateLimiter.middleware.js';
import {
  checkoutSchema,
  nearbyAddressSchema,
  trackOrderSchema,
  adminOrderStatusSchema,
  adminOrderQuerySchema,
  customerOrderQuerySchema,
} from '../validators/order.validator.js';
import { ROLES } from '../constants/index.js';

const require = createRequire(import.meta.url);
const { createIdempotency } = require('../../razorpay-module/helpers/idempotency.js');

const router = Router();
const idempotent = createIdempotency(mongoose);

// ─── Customer order routes ───
router.post(
  '/checkout',
  authenticate,
  checkoutRateLimit,
  validateBody(checkoutSchema),
  idempotent(),
  orderController.checkout,
);

router.post('/nearby-address', locationRateLimit, validateBody(nearbyAddressSchema), orderController.nearbyAddress);
router.post('/track', trackRateLimit, validateBody(trackOrderSchema), orderController.trackOrder);
router.get('/', authenticate, validateQuery(customerOrderQuerySchema), orderController.getOrders);

const adminOnly = [authenticate, authorize(ROLES.ADMIN)];
router.get('/desk', ...adminOnly, validateQuery(adminOrderQuerySchema), orderController.adminGetOrders);
router.patch('/desk/:id/status', ...adminOnly, validateBody(adminOrderStatusSchema), orderController.adminUpdateOrderStatus);
router.post('/desk/:id/cancel', ...adminOnly, orderController.adminCancelOrder);
router.post('/desk/:id/refund', ...adminOnly, orderController.adminRefundOrder);

router.get('/:id', authenticate, orderController.getOrder);
router.post('/:id/cancel', authenticate, orderController.cancelOrder);

router.get('/admin/all', ...adminOnly, validateQuery(adminOrderQuerySchema), orderController.adminGetOrders);
router.get('/admin/:id', ...adminOnly, orderController.adminGetOrder);
router.patch('/admin/:id/status', ...adminOnly, validateBody(adminOrderStatusSchema), orderController.adminUpdateOrderStatus);

export default router;
