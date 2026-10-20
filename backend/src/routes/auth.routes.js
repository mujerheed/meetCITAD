import express from 'express';
import { authController } from '../controllers/index.js';
import { protect } from '../middleware/index.js';
import {
  authLimiter,
  strictAuthLimiter,
  refreshLimiter,
  registrationLimiter,
} from '../middleware/rateLimiter.js';
import {
  validateSignup,
  validateLogin,
  validateAdminLogin,
  validateForgotPassword,
  validateUpdatePassword,
} from '../middleware/validation.js';

const router = express.Router();

router.post(
  '/signup',
  registrationLimiter,
  validateSignup,
  authController.signup.bind(authController)
);
router.post(
  '/login',
  authLimiter,
  validateLogin,
  authController.login.bind(authController)
);
router.post(
  '/admin/login',
  authLimiter,
  validateAdminLogin,
  authController.adminLogin.bind(authController)
);
router.post(
  '/verify-otp',
  strictAuthLimiter,
  authController.verifyOTP.bind(authController)
);
router.post(
  '/resend-otp',
  strictAuthLimiter,
  authController.resendOTP.bind(authController)
);
router.post(
  '/forgot-password',
  strictAuthLimiter,
  validateForgotPassword,
  authController.forgotPassword.bind(authController)
);
router.post(
  '/reset-password',
  strictAuthLimiter,
  authController.resetPassword.bind(authController)
);
router.post(
  '/change-password',
  protect,
  strictAuthLimiter,
  validateUpdatePassword,
  authController.changePassword.bind(authController)
);
router.post('/refresh', refreshLimiter, authController.refreshToken.bind(authController));
router.post('/logout', protect, authController.logout.bind(authController));
router.get('/me', protect, authController.getCurrentUser.bind(authController));

export default router;
