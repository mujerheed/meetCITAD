import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';
import config from '../config/index.js';
import { AppError } from './errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Create rate limiter with Redis store
 */
const createRateLimiter = (options) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = null,
  } = options;

  // Use Redis store if available, otherwise in-memory
  const store = redisClient.isReady
    ? new RedisStore({
        // @ts-expect-error - Known issue with RedisStore types
        client: redisClient,
        prefix: 'rl:',
      })
    : undefined;

  if (!store) {
    logger.warn('Redis not available, using in-memory rate limiting');
  }

  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests,
    skipFailedRequests,
    store,
    keyGenerator: keyGenerator || ((req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?._id?.toString() || req.ip;
    }),
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for ${req.ip}`);
      res.status(429).json({
        success: false,
        message,
      });
    },
  });
};

/**
 * General API Rate Limiter
 * 100 requests per 15 minutes
 */
export const apiLimiter = createRateLimiter({
  windowMs: config.security.rateLimiting.windowMs,
  max: config.security.rateLimiting.max,
  message: 'Too many requests from this IP, please try again later.',
});

/**
 * Authentication Rate Limiter
 * 5 requests per 15 minutes
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Strict Authentication Rate Limiter (for OTP, password reset)
 * 3 requests per 15 minutes
 */
export const strictAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
});

/**
 * Registration Rate Limiter
 * 3 registrations per hour per IP
 */
export const registrationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many accounts created from this IP, please try again after an hour.',
});

/**
 * QR Code Scan Rate Limiter
 * 100 scans per minute
 */
export const scanLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many scan attempts, please wait a moment.',
});

/**
 * Certificate Download Rate Limiter
 * 10 downloads per 5 minutes
 */
export const downloadLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: 'Too many download requests, please try again later.',
});

/**
 * Email/SMS Rate Limiter
 * 5 requests per hour
 */
export const communicationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many communication requests, please try again later.',
  keyGenerator: (req) => {
    // Use email/phone if provided, otherwise user ID or IP
    return req.body.email || req.body.phone || req.user?._id?.toString() || req.ip;
  },
});

/**
 * Feedback Submission Rate Limiter
 * 5 submissions per hour
 */
export const feedbackLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many feedback submissions, please try again later.',
});

/**
 * File Upload Rate Limiter
 * 20 uploads per hour
 */
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many file uploads, please try again later.',
});

/**
 * Admin Action Rate Limiter
 * 200 requests per 15 minutes (higher limit for admin operations)
 */
export const adminLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many admin actions, please slow down.',
});

/**
 * Custom Rate Limiter Creator
 * Allows creating custom rate limiters on the fly
 */
export const createCustomLimiter = createRateLimiter;

/**
 * Skip rate limiting for specific conditions
 */
export const skipRateLimitIf = (condition) => {
  return (req, res, next) => {
    if (condition(req)) {
      req.skipRateLimit = true;
    }
    next();
  };
};

/**
 * Skip rate limiting for admins
 */
export const skipForAdmins = skipRateLimitIf((req) => req.userRole === 'admin');

/**
 * Dynamic Rate Limiter based on user role
 */
export const dynamicLimiter = (req, res, next) => {
  const limits = {
    admin: 200,
    user: 100,
    guest: 50,
  };

  const userType = req.userRole || 'guest';
  const max = limits[userType] || limits.guest;

  const limiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max,
    message: `Too many requests for ${userType}s, please try again later.`,
  });

  return limiter(req, res, next);
};

/**
 * IP-based Rate Limiter (strict)
 * For public endpoints
 */
export const ipLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests from this IP address.',
  keyGenerator: (req) => req.ip, // Always use IP
});

/**
 * Reset Rate Limit for User
 * Admin utility function
 */
export const resetRateLimit = async (identifier) => {
  try {
    if (!redisClient.isReady) {
      logger.warn('Redis not available, cannot reset rate limit');
      return false;
    }

    const pattern = `rl:${identifier}*`;
    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Reset rate limit for: ${identifier}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error resetting rate limit:', error);
    return false;
  }
};

export default {
  apiLimiter,
  authLimiter,
  strictAuthLimiter,
  registrationLimiter,
  scanLimiter,
  downloadLimiter,
  communicationLimiter,
  feedbackLimiter,
  uploadLimiter,
  adminLimiter,
  createCustomLimiter,
  skipRateLimitIf,
  skipForAdmins,
  dynamicLimiter,
  ipLimiter,
  resetRateLimit,
};
