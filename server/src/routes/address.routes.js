import { Router } from 'express';
import * as addressController from '../controllers/address.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { createAddressSchema, updateAddressSchema } from '../validators/address.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', addressController.getAddresses);
router.post('/', validateBody(createAddressSchema), addressController.addAddress);
router.get('/:id', addressController.getAddress);
router.patch('/:id', validateBody(updateAddressSchema), addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);

export default router;
