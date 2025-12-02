import { body, param, query, validationResult } from 'express-validator';
import { AppError } from './errorHandler.js';
import mongoose from 'mongoose';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    return next(new AppError('Validation failed', 400, errorMessages));
  }

  next();
};

/**
 * Custom validator: Check if value is valid ObjectId
 */
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * Custom validator: Check if password is strong enough
 */
const isStrongPassword = (value) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumbers = /\d/.test(value);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

  return (
    value.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
  );
};

// ==================== AUTH VALIDATIONS ====================

/**
 * Signup Validation
 */
export const validateSignup = [
  body('fullname')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom(isStrongPassword)
    .withMessage(
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
    ),

  body('passwordConfirm')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),

  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  body('organisation')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organisation name cannot exceed 200 characters'),

  handleValidationErrors,
];

/**
 * Login Validation
 */
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors,
];

/**
 * Admin Login Validation
 */
export const validateAdminLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .matches(/@citad\.(org|edu\.ng)$/)
    .withMessage('Only CITAD email addresses are allowed')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  body('otp')
    .optional()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),

  handleValidationErrors,
];

/**
 * Forgot Password Validation
 */
export const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  handleValidationErrors,
];

/**
 * Reset Password Validation
 */
export const validateResetPassword = [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom(isStrongPassword)
    .withMessage(
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
    ),

  body('passwordConfirm')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),

  param('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  handleValidationErrors,
];

/**
 * Update Password Validation
 */
export const validateUpdatePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .custom(isStrongPassword)
    .withMessage(
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
    )
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password'),

  body('newPasswordConfirm')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),

  handleValidationErrors,
];

// ==================== EVENT VALIDATIONS ====================

/**
 * Create Event Validation
 */
export const validateCreateEvent = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Event title is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Event description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('startDateTime')
    .notEmpty()
    .withMessage('Start date and time is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => new Date(value) > new Date())
    .withMessage('Start date must be in the future'),

  body('endDateTime')
    .notEmpty()
    .withMessage('End date and time is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value, { req }) => new Date(value) > new Date(req.body.startDateTime))
    .withMessage('End date must be after start date'),

  body('venue.name')
    .trim()
    .notEmpty()
    .withMessage('Venue name is required'),

  body('venue.city')
    .optional()
    .trim(),

  body('category')
    .optional()
    .isIn(['workshop', 'seminar', 'training', 'conference', 'webinar', 'other'])
    .withMessage('Invalid event category'),

  body('capacity')
    .notEmpty()
    .withMessage('Event capacity is required')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10,000'),

  body('hostBy')
    .trim()
    .notEmpty()
    .withMessage('Host information is required'),

  handleValidationErrors,
];

/**
 * Update Event Validation
 */
export const validateUpdateEvent = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid event ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('capacity')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10,000'),

  handleValidationErrors,
];

/**
 * Event ID Validation
 */
export const validateEventId = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid event ID'),

  handleValidationErrors,
];

// ==================== USER VALIDATIONS ====================

/**
 * Update Profile Validation
 */
export const validateUpdateProfile = [
  body('fullname')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  body('organisation')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organisation name cannot exceed 200 characters'),

  body('jobTitle')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Job title cannot exceed 100 characters'),

  body('biography')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Biography cannot exceed 500 characters'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => new Date(value) < new Date())
    .withMessage('Date of birth must be in the past'),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender value'),

  handleValidationErrors,
];

/**
 * User ID Validation
 */
export const validateUserId = [
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid user ID'),

  handleValidationErrors,
];

// ==================== FEEDBACK VALIDATIONS ====================

/**
 * Submit Feedback Validation
 */
export const validateSubmitFeedback = [
  body('eventId')
    .notEmpty()
    .withMessage('Event ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid event ID'),

  body('ratings.overall')
    .notEmpty()
    .withMessage('Overall rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('ratings.content')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('npsScore')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('NPS score must be between 0 and 10'),

  body('booleanQuestions.wouldRecommend')
    .notEmpty()
    .withMessage('Recommendation question is required')
    .isBoolean()
    .withMessage('Must be true or false'),

  body('comments.whatYouLiked')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),

  handleValidationErrors,
];

// ==================== ATTENDANCE VALIDATIONS ====================

/**
 * QR Scan Validation
 */
export const validateQRScan = [
  body('qrData')
    .notEmpty()
    .withMessage('QR data is required')
    .isJSON()
    .withMessage('Invalid QR data format'),

  body('signature')
    .notEmpty()
    .withMessage('QR signature is required'),

  handleValidationErrors,
];

// ==================== PAGINATION & QUERY VALIDATIONS ====================

/**
 * Pagination Validation
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sort')
    .optional()
    .trim(),

  handleValidationErrors,
];

/**
 * Date Range Validation
 */
export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  handleValidationErrors,
];

// ==================== CERTIFICATE VALIDATIONS ====================

/**
 * Certificate Verification Validation
 */
export const validateCertificateVerification = [
  param('hash')
    .notEmpty()
    .withMessage('Verification hash is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid verification hash format'),

  handleValidationErrors,
];

// ==================== NOTIFICATION VALIDATIONS ====================

/**
 * Send Notification Validation
 */
export const validateSendNotification = [
  body('userId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid user ID'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('Notification title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Notification message is required')
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),

  body('type')
    .notEmpty()
    .withMessage('Notification type is required')
    .isIn([
      'event_reminder',
      'registration_confirmation',
      'event_update',
      'certificate_ready',
      'feedback_request',
      'system',
      'promotional',
      'announcement',
    ])
    .withMessage('Invalid notification type'),

  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority level'),

  handleValidationErrors,
];

export default {
  handleValidationErrors,
  validateSignup,
  validateLogin,
  validateAdminLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUpdatePassword,
  validateCreateEvent,
  validateUpdateEvent,
  validateEventId,
  validateUpdateProfile,
  validateUserId,
  validateSubmitFeedback,
  validateQRScan,
  validatePagination,
  validateDateRange,
  validateCertificateVerification,
  validateSendNotification,
};
