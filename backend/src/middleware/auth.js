import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { User, Admin } from '../models/index.js';
import { AppError } from './errorHandler.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Verify JWT Token
 */
const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired. Please login again.', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token. Please login again.', 401);
    }
    throw new AppError('Token verification failed.', 401);
  }
};

/**
 * Generate Access Token
 */
export const generateAccessToken = (userId, role = 'user') => {
  return jwt.sign(
    { id: userId, role },
    config.jwt.accessTokenSecret,
    { expiresIn: config.jwt.accessTokenExpiry }
  );
};

/**
 * Generate Refresh Token
 */
export const generateRefreshToken = (userId, role = 'user') => {
  return jwt.sign(
    { id: userId, role },
    config.jwt.refreshTokenSecret,
    { expiresIn: config.jwt.refreshTokenExpiry }
  );
};

/**
 * Protect Routes - Verify Access Token
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies (for web applications)
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please login to access this resource.', 401));
    }

    // Verify token
    const decoded = verifyToken(token, config.jwt.accessTokenSecret);

    // Check if user still exists
    let currentUser;
    if (decoded.role === 'admin') {
      currentUser = await Admin.findById(decoded.id).select('+otpEnabled +otpSecret');
    } else {
      currentUser = await User.findById(decoded.id).select('+twoFactorEnabled +twoFactorSecret');
    }

    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Check if user is active
    if (currentUser.status !== 'active') {
      return next(new AppError('Your account has been deactivated. Please contact support.', 403));
    }

    // Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('User recently changed password. Please login again.', 401));
    }

    // Grant access to protected route
    req.user = currentUser;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict access to specific roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
};

/**
 * Check Admin Permissions
 */
export const checkPermission = (...permissions) => {
  return async (req, res, next) => {
    if (req.userRole !== 'admin') {
      return next(new AppError('This action is restricted to administrators only.', 403));
    }

    const admin = req.user;

    // Super admin has all permissions
    if (admin.role === 'super_admin') {
      return next();
    }

    // Check if admin has required permissions
    const hasPermission = permissions.every(permission => 
      admin.hasPermission(permission)
    );

    if (!hasPermission) {
      logger.warn(`Admin ${admin.email} attempted unauthorized action: ${permissions.join(', ')}`);
      return next(
        new AppError('You do not have the required permissions to perform this action.', 403)
      );
    }

    next();
  };
};

/**
 * Verify OTP for Admin
 */
export const verifyOTP = async (req, res, next) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return next(new AppError('OTP is required for this action.', 400));
    }

    const admin = req.user;

    if (!admin.otpEnabled) {
      return next(new AppError('OTP is not enabled for your account.', 400));
    }

    // Verify OTP using speakeasy
    const isValid = speakeasy.totp.verify({
      secret: admin.otpSecret,
      encoding: 'base32',
      token: otp,
      window: 2, // Allow 2 time steps before/after for clock skew
    });

    if (!isValid) {
      // Log failed OTP attempt
      await admin.logAction('otp_verification_failed', 'admin', admin._id, {
        ip: req.ip,
        timestamp: new Date(),
      });

      return next(new AppError('Invalid OTP. Please try again.', 401));
    }

    // Log successful OTP verification
    await admin.logAction('otp_verified', 'admin', admin._id, {
      ip: req.ip,
      timestamp: new Date(),
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Verify 2FA for User
 */
export const verify2FA = async (req, res, next) => {
  try {
    const { twoFactorCode } = req.body;

    if (!twoFactorCode) {
      return next(new AppError('2FA code is required.', 400));
    }

    const user = req.user;

    if (!user.twoFactorEnabled) {
      return next(new AppError('2FA is not enabled for your account.', 400));
    }

    // Verify 2FA code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorCode,
      window: 2,
    });

    if (!isValid) {
      return next(new AppError('Invalid 2FA code. Please try again.', 401));
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional Authentication - Attach user if token exists but don't fail
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next();
    }

    const decoded = verifyToken(token, config.jwt.accessTokenSecret);

    let currentUser;
    if (decoded.role === 'admin') {
      currentUser = await Admin.findById(decoded.id);
    } else {
      currentUser = await User.findById(decoded.id);
    }

    if (currentUser && currentUser.status === 'active') {
      req.user = currentUser;
      req.userRole = decoded.role;
    }

    next();
  } catch (error) {
    // Don't fail, just proceed without user
    next();
  }
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required.', 400));
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, config.jwt.refreshTokenSecret);

    // Check if user still exists
    let currentUser;
    if (decoded.role === 'admin') {
      currentUser = await Admin.findById(decoded.id);
    } else {
      currentUser = await User.findById(decoded.id);
    }

    if (!currentUser) {
      return next(new AppError('User no longer exists.', 401));
    }

    if (currentUser.status !== 'active') {
      return next(new AppError('Account is not active.', 403));
    }

    // Attach user to request
    req.user = currentUser;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user owns the resource
 */
export const isOwner = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (req.userRole === 'admin') {
      // Admins can access any resource
      return next();
    }

    const resourceUserId = req.resource?.[resourceUserIdField] || req.params.userId;
    
    if (!resourceUserId) {
      return next(new AppError('Resource owner could not be determined.', 400));
    }

    if (resourceUserId.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only access your own resources.', 403));
    }

    next();
  };
};

export default {
  protect,
  restrictTo,
  checkPermission,
  verifyOTP,
  verify2FA,
  optionalAuth,
  verifyRefreshToken,
  isOwner,
  generateAccessToken,
  generateRefreshToken,
};
