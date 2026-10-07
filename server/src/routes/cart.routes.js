import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { addCartItemSchema, updateCartItemSchema } from '../validators/order.validator.js';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validateBody(addCartItemSchema), cartController.addItem);
router.patch('/items/:variantId', validateBody(updateCartItemSchema), cartController.updateItem);
router.delete('/items/:variantId', cartController.removeItem);
router.delete('/', cartController.clearCart);

export default router;
