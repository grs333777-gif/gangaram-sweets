import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateBody, validateQuery } from '../middlewares/validate.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
  updateVariantPriceSchema,
  updateVariantStatusSchema,
  addVariantSchema,
  productQuerySchema,
} from '../validators/product.validator.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// ─── Public ───
router.get('/', validateQuery(productQuerySchema), productController.listProducts);
router.get('/:slug', productController.getProduct);

// ─── Admin ───
const adminOnly = [authenticate, authorize(ROLES.ADMIN)];

router.get('/admin/all', ...adminOnly, productController.adminListProducts);
router.get('/admin/:id', ...adminOnly, productController.adminGetProduct);
router.post('/', ...adminOnly, validateBody(createProductSchema), productController.adminCreateProduct);
router.patch('/:id', ...adminOnly, validateBody(updateProductSchema), productController.adminUpdateProduct);
router.patch('/:id/deactivate', ...adminOnly, productController.adminDeactivateProduct);
router.patch('/:id/activate', ...adminOnly, productController.adminActivateProduct);
router.patch('/:id/stock', ...adminOnly, validateBody(updateStockSchema), productController.adminUpdateStock);
router.patch('/:id/variant-price', ...adminOnly, validateBody(updateVariantPriceSchema), productController.adminUpdateVariantPrice);
router.patch('/:id/variant-status', ...adminOnly, validateBody(updateVariantStatusSchema), productController.adminUpdateVariantStatus);
router.post('/:id/variants', ...adminOnly, validateBody(addVariantSchema), productController.adminAddVariant);

export default router;
