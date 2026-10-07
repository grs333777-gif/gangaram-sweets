import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { authRateLimit } from '../middlewares/rateLimiter.middleware.js';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

// All auth routes have stricter rate limiting
router.use(authRateLimit);

router.post('/signup', validateBody(signupSchema), authController.signup);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getProfile);

export default router;
