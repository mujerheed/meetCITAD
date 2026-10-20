import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { User, Admin } from '../models/index.js';
import { emailService } from '../services/index.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Auth Controller
 * Handles authentication and authorization for both users and admins.
 *
 * Canonical user fields follow the User model: fullname, emailVerified,
 * verificationToken, verificationExpires, resetToken, resetTokenExpiration,
 * profileImage, organisation, biography.
 */

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

const splitName = (fullname = '') => {
  const parts = String(fullname).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

class AuthController {
  /**
   * Generate JWT tokens
   */
  generateTokens(userId, role = 'user', tokenVersion = 0) {
    const accessToken = jwt.sign(
      { id: userId, role, ver: tokenVersion },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn }
    );

    const refreshToken = jwt.sign(
      { id: userId, role, ver: tokenVersion },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  serializeUser(user) {
    const { firstName, lastName } = splitName(user.fullname);

    return {
      id: user._id,
      _id: user._id,
      email: user.email,
      fullname: user.fullname,
      firstName,
      lastName,
      phone: user.phone,
      organisation: user.organisation,
      participantType: user.participantType,
      jobTitle: user.jobTitle,
      biography: user.biography,
      profileImage: user.profileImage,
      emailVerified: user.emailVerified,
      stats: user.stats,
      preferences: user.preferences,
      createdAt: user.createdAt,
    };
  }

  serializeAdmin(admin) {
    const { firstName, lastName } = splitName(admin.fullname);

    return {
      id: admin._id,
      _id: admin._id,
      email: admin.email,
      fullname: admin.fullname,
      firstName,
      lastName,
      role: admin.role,
      permissions: admin.permissions,
      department: admin.department,
      phone: admin.phone,
      profileImage: admin.profileImage,
      status: admin.status,
      emailVerified: admin.emailVerified,
      otpEnabled: admin.otpEnabled,
      lastLogin: admin.lastLogin,
      loginAttempts: admin.loginAttempts,
      passwordChangedAt: admin.passwordChangedAt,
      createdAt: admin.createdAt,
    };
  }

  /**
   * Create/send a new verification OTP for a user.
   */
  async issueVerificationOTP(user) {
    const otp = this.generateOTP();

    user.verificationToken = hashToken(otp);
    user.verificationExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    await user.save();

    try {
      await emailService.sendOTPEmail(user, otp);
    } catch (error) {
      logger.error(`Could not send verification email to ${user.email}: ${error.message}`);

      if (config.isProduction) {
        throw new AppError(
          'The verification email could not be sent. Please try again later.',
          502
        );
      }
    }

    // In development without a working mail provider, print the code so the
    // flow can still be completed locally.
    if (!config.isProduction) {
      logger.info(`Development verification code for ${user.email}: ${otp}`);
    }

    return otp;
  }

  /**
   * User Signup
   * POST /api/v1/auth/signup
   */
  async signup(req, res, next) {
    try {
      const {
        fullname,
        firstName,
        lastName,
        email,
        password,
        phone,
        organisation,
        participantType,
      } = req.body;

      const resolvedName =
        (fullname || [firstName, lastName].filter(Boolean).join(' ')).trim();

      if (!resolvedName) {
        throw new AppError('Full name is required', 400);
      }

      const normalizedEmail = email.toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail });

      if (existingUser) {
        if (existingUser.emailVerified) {
          throw new AppError('User with this email already exists', 409);
        }

        // Re-issue the verification code for an unverified account.
        await this.issueVerificationOTP(existingUser);

        return res.status(200).json({
          success: true,
          message: 'Account already exists but is not verified. A new code has been sent.',
          data: {
            userId: existingUser._id,
            email: existingUser.email,
            requiresVerification: true,
          },
        });
      }

      const user = await User.create({
        fullname: resolvedName,
        email: normalizedEmail,
        password,
        phone,
        organisation,
        participantType,
      });

      await this.issueVerificationOTP(user);

      logger.info(`New user signed up: ${user.email}`);

      res.status(201).json({
        success: true,
        message:
          'Account created successfully. Please verify your email with the code sent.',
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

      const user = await User.findOne({ email: email.toLowerCase() }).select(
        '+password'
      );

      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      if (user.status !== 'active') {
        throw new AppError(`Account is ${user.status}. Please contact support.`, 403);
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await user.incrementLoginAttempts();
        throw new AppError('Invalid email or password', 401);
      }

      if (user.isLocked) {
        throw new AppError(
          'Account is temporarily locked due to failed login attempts. Try again later.',
          403
        );
      }

      if (!user.emailVerified) {
        await this.issueVerificationOTP(user);
        throw new AppError(
          'Email not verified. A new verification code has been sent to your email.',
          403
        );
      }

      const { accessToken, refreshToken } = this.generateTokens(
        user._id,
        'user',
        user.tokenVersion || 0
      );

      user.lastLogin = new Date();
      await user.save();
      await user.resetLoginAttempts();

      logger.info(`User logged in: ${user.email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: this.serializeUser(user),
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

      const admin = await Admin.findOne({ email: email.toLowerCase() }).select(
        '+password +otpSecret'
      );

      if (!admin) {
        throw new AppError('Invalid email or password', 401);
      }

      if (admin.status !== 'active') {
        throw new AppError(
          `Account is ${admin.status}. Please contact the system administrator.`,
          403
        );
      }

      if (admin.isLocked) {
        throw new AppError(
          'Account is locked due to multiple failed login attempts. Please contact the system administrator.',
          403
        );
      }

      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        await admin.incrementLoginAttempts();
        throw new AppError('Invalid email or password', 401);
      }

      // TOTP is only enforced when the admin actually has a secret configured.
      if (admin.otpEnabled && admin.otpSecret) {
        if (!twoFactorCode) {
          throw new AppError('Two-factor authentication code required', 403);
        }

        const isValidOTP = speakeasy.totp.verify({
          secret: admin.otpSecret,
          encoding: 'base32',
          token: twoFactorCode,
          window: 2,
        });

        if (!isValidOTP) {
          throw new AppError('Invalid two-factor authentication code', 401);
        }
      }

      const { accessToken, refreshToken } = this.generateTokens(
        admin._id,
        'admin',
        admin.tokenVersion || 0
      );

      await admin.resetLoginAttempts();
      admin.lastLogin = new Date();
      admin.loginHistory.push({
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      });
      await admin.save();

      await admin.logAction(
        'login',
        'admin',
        admin._id,
        'Admin logged in',
        req.ip
      );

      logger.info(`Admin logged in: ${admin.email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          admin: this.serializeAdmin(admin),
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify Email OTP
   * POST /api/v1/auth/verify-otp
   */
  async verifyOTP(req, res, next) {
    try {
      const { email, otp } = req.body;

      if (!otp) {
        throw new AppError('Verification code is required', 400);
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.emailVerified) {
        throw new AppError('Email already verified', 400);
      }

      if (!user.verificationToken || user.verificationToken !== hashToken(otp)) {
        throw new AppError('Invalid verification code', 400);
      }

      if (!user.verificationExpires || new Date() > user.verificationExpires) {
        throw new AppError(
          'Verification code has expired. Please request a new one.',
          400
        );
      }

      user.emailVerified = true;
      user.verificationToken = undefined;
      user.verificationExpires = undefined;
      user.lastLogin = new Date();
      await user.save();

      const { accessToken, refreshToken } = this.generateTokens(
        user._id,
        'user',
        user.tokenVersion || 0
      );

      logger.info(`Email verified for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: this.serializeUser(user),
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend Verification OTP
   * POST /api/v1/auth/resend-otp
   */
  async resendOTP(req, res, next) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.emailVerified) {
        throw new AppError('Email already verified', 400);
      }

      await this.issueVerificationOTP(user);

      logger.info(`Verification code resent to: ${user.email}`);

      res.json({
        success: true,
        message: 'Verification code sent successfully',
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
        return res.json({
          success: true,
          message:
            'If an account exists with this email, a password reset link has been sent.',
        });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');

      user.resetToken = hashToken(resetToken);
      user.resetTokenExpiration = new Date(Date.now() + RESET_EXPIRY_MS);
      await user.save();

      await emailService.sendPasswordResetEmail(user, resetToken);

      logger.info(`Password reset requested for: ${user.email}`);

      res.json({
        success: true,
        message:
          'If an account exists with this email, a password reset link has been sent.',
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
      const { token, newPassword, password } = req.body;
      const nextPassword = newPassword || password;

      if (!token) {
        throw new AppError('Reset token is required', 400);
      }

      if (!nextPassword) {
        throw new AppError('New password is required', 400);
      }

      const hashedToken = hashToken(token);

      const user = await User.findOne({
        resetToken: hashedToken,
        resetTokenExpiration: { $gt: new Date() },
      }).select('+password');

      if (!user) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      user.password = nextPassword;
      user.resetToken = undefined;
      user.resetTokenExpiration = undefined;
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
      const isAdmin = req.userRole === 'admin';

      const account = isAdmin
        ? await Admin.findById(userId).select('+password')
        : await User.findById(userId).select('+password');

      if (!account) {
        throw new AppError(isAdmin ? 'Admin not found' : 'User not found', 404);
      }

      const isPasswordValid = await account.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 401);
      }

      // Password history is only tracked for participant accounts.
      if (!isAdmin) {
        if (account.passwordHistory?.length >= 5) {
          account.passwordHistory.shift();
        }
        account.passwordHistory = account.passwordHistory || [];
        account.passwordHistory.push(account.password);
      }

      account.password = newPassword;
      account.tokenVersion = (account.tokenVersion || 0) + 1;
      await account.save();

      logger.info(
        `Password changed for ${isAdmin ? 'admin' : 'user'}: ${account.email}`
      );

      res.json({
        success: true,
        message: 'Password changed successfully. Please sign in again.',
        data: { requiresReauthentication: true },
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

      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

      const account =
        decoded.role === 'admin'
          ? await Admin.findById(decoded.id)
          : await User.findById(decoded.id);

      if (!account) {
        throw new AppError('User not found', 404);
      }

      if (account.status !== 'active') {
        throw new AppError('Account is not active', 403);
      }

      if (account.changedPasswordAfter && account.changedPasswordAfter(decoded.iat)) {
        throw new AppError('Password recently changed. Please login again.', 401);
      }

      if (Number(decoded.ver ?? -1) !== Number(account.tokenVersion ?? 0)) {
        throw new AppError('Session is no longer valid. Please login again.', 401);
      }

      const tokens = this.generateTokens(
        account._id,
        decoded.role,
        account.tokenVersion || 0
      );

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokens,
      });
    } catch (error) {
      if (
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
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
      // Invalidating the token version revokes every outstanding access and
      // refresh token for this account. The client clears its local session
      // immediately after this response.
      const AccountModel = req.userRole === 'admin' ? Admin : User;
      await AccountModel.findByIdAndUpdate(req.user.id, {
        $inc: { tokenVersion: 1 },
      });

      logger.info(`Account logged out: ${req.user.id}`);

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
      const role = req.userRole || 'user';

      if (role === 'admin') {
        const admin = await Admin.findById(req.user.id);
        if (!admin) {
          throw new AppError('Admin not found', 404);
        }

        return res.json({
          success: true,
          data: { user: this.serializeAdmin(admin), role: 'admin' },
        });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: { user: this.serializeUser(user), role: 'user' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
