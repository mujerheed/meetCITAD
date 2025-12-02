import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, Admin } from '../models/index.js';
import { emailService, smsService } from '../services/index.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Auth Controller
 * Handles authentication and authorization for both users and admins
 */

class AuthController {
  /**
   * Generate JWT tokens
   */
  generateTokens(userId, role = 'user') {
    const accessToken = jwt.sign(
      { id: userId, role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { id: userId, role },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Generate OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * User Signup
   * POST /api/v1/auth/signup
   */
  async signup(req, res, next) {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }

      // Generate OTP for email verification
      const otp = this.generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create user
      const user = await User.create({
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
        phone,
        verification: {
          email: {
            code: otp,
            expiresAt: otpExpiry,
          },
        },
      });

      // Send verification email
      await emailService.sendWelcomeEmail({
        to: user.email,
        name: user.firstName,
        verificationCode: otp,
      });

      logger.info(`New user signed up: ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'Account created successfully. Please verify your email with the OTP sent.',
        data: {
          userId: user._id,
          email: user.email,
          requiresVerification: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User Login
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Check if account is active
      if (user.status !== 'active') {
        throw new AppError(`Account is ${user.status}. Please contact support.`, 403);
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }

      // Check if email is verified
      if (!user.verification.email.verified) {
        // Resend OTP
        const otp = this.generateOTP();
        user.verification.email.code = otp;
        user.verification.email.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await emailService.sendWelcomeEmail({
          to: user.email,
          name: user.firstName,
          verificationCode: otp,
        });

        throw new AppError('Email not verified. A new OTP has been sent to your email.', 403);
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user._id, 'user');

      // Update last login
      user.lastLoginAt = new Date();
      user.lastLoginIP = req.ip;
      await user.save();

      logger.info(`User logged in: ${user.email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            profilePicture: user.profilePicture,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin Login
   * POST /api/v1/auth/admin/login
   */
  async adminLogin(req, res, next) {
    try {
      const { email, password, twoFactorCode } = req.body;

      // Find admin
      const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
      if (!admin) {
        throw new AppError('Invalid email or password', 401);
      }

      // Check if account is active
      if (admin.status !== 'active') {
        throw new AppError(`Account is ${admin.status}. Please contact system administrator.`, 403);
      }

      // Check if account is locked
      if (admin.isLocked) {
        throw new AppError('Account is locked due to multiple failed login attempts. Please contact system administrator.', 403);
      }

      // Verify password
      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        await admin.incrementLoginAttempts();
        throw new AppError('Invalid email or password', 401);
      }

      // Check 2FA if enabled
      if (admin.twoFactorAuth.enabled) {
        if (!twoFactorCode) {
          throw new AppError('Two-factor authentication code required', 403);
        }

        // Verify 2FA code (simplified - should use authenticator app in production)
        if (twoFactorCode !== admin.twoFactorAuth.secret) {
          throw new AppError('Invalid two-factor authentication code', 401);
        }
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(admin._id, 'admin');

      // Reset login attempts and update last login
      await admin.resetLoginAttempts();
      admin.lastLoginAt = new Date();
      admin.lastLoginIP = req.ip;
      await admin.save();

      // Log admin action
      await admin.logAction('login', 'admin', admin._id, 'Admin logged in', req.ip);

      logger.info(`Admin logged in: ${admin.email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          admin: {
            id: admin._id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role,
            permissions: admin.permissions,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify OTP
   * POST /api/v1/auth/verify-otp
   */
  async verifyOTP(req, res, next) {
    try {
      const { email, otp } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if already verified
      if (user.verification.email.verified) {
        throw new AppError('Email already verified', 400);
      }

      // Check OTP
      if (user.verification.email.code !== otp) {
        throw new AppError('Invalid OTP', 400);
      }

      // Check expiry
      if (new Date() > user.verification.email.expiresAt) {
        throw new AppError('OTP has expired. Please request a new one.', 400);
      }

      // Mark as verified
      user.verification.email.verified = true;
      user.verification.email.verifiedAt = new Date();
      user.verification.email.code = undefined;
      user.verification.email.expiresAt = undefined;
      await user.save();

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user._id, 'user');

      logger.info(`Email verified for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend OTP
   * POST /api/v1/auth/resend-otp
   */
  async resendOTP(req, res, next) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.verification.email.verified) {
        throw new AppError('Email already verified', 400);
      }

      // Generate new OTP
      const otp = this.generateOTP();
      user.verification.email.code = otp;
      user.verification.email.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      // Send email
      await emailService.sendWelcomeEmail({
        to: user.email,
        name: user.firstName,
        verificationCode: otp,
      });

      logger.info(`OTP resent to: ${user.email}`);

      res.json({
        success: true,
        message: 'OTP sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot Password
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if user exists
        return res.json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      // Send reset email
      const resetUrl = `${config.app.frontendUrl}/reset-password?token=${resetToken}`;
      await emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.firstName,
        resetUrl,
      });

      logger.info(`Password reset requested for: ${user.email}`);

      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset Password
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      // Hash token
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!user) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      // Update password
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      logger.info(`Password reset successful for: ${user.email}`);

      res.json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change Password (Authenticated)
   * POST /api/v1/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 401);
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh Token
   * POST /api/v1/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token required', 400);
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

      // Check if user/admin still exists
      let user;
      if (decoded.role === 'admin') {
        user = await Admin.findById(decoded.id);
      } else {
        user = await User.findById(decoded.id);
      }

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.status !== 'active') {
        throw new AppError('Account is not active', 403);
      }

      // Generate new tokens
      const tokens = this.generateTokens(user._id, decoded.role);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokens,
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return next(new AppError('Invalid or expired refresh token', 401));
      }
      next(error);
    }
  }

  /**
   * Logout
   * POST /api/v1/auth/logout
   */
  async logout(req, res, next) {
    try {
      // In a production app with Redis, you would blacklist the token here
      // For now, we'll just return success and let the client delete the token

      logger.info(`User logged out: ${req.user.id}`);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Current User/Admin
   * GET /api/v1/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      const userId = req.user.id;
      const role = req.user.role;

      let user;
      if (role === 'admin') {
        user = await Admin.findById(userId).select('-password -twoFactorAuth.secret');
      } else {
        user = await User.findById(userId).select('-password');
      }

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
