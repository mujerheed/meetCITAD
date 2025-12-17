import express from 'express';
import { authController } from '../controllers/index.js';
import { protect } from '../middleware/index.js';
import {
  validateSignup,
  validateLogin,
  validateAdminLogin,
  validateForgotPassword,
  validateUpdatePassword,
} from '../middleware/validation.js';

const router = express.Router();

router.post('/signup', validateSignup, authController.signup.bind(authController));
router.post('/login', validateLogin, authController.login.bind(authController));
router.post('/admin/login', validateAdminLogin, authController.adminLogin.bind(authController));
router.post('/verify-otp', authController.verifyOTP.bind(authController));
router.post('/resend-otp', authController.resendOTP.bind(authController));
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.post('/change-password', protect, validateUpdatePassword, authController.changePassword.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));
router.post('/logout', protect, authController.logout.bind(authController));
router.get('/me', protect, authController.getCurrentUser.bind(authController));

export default router;
