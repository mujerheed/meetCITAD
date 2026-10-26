import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';
import { handleValidationErrors } from './validation.js';
import { parseDateOnly } from '../utils/week.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const optionalDateOnly = (value) => {
  if (value === undefined || value === null || value === '') return true;
  return Boolean(parseDateOnly(value));
};

const looksLikeDate = (value) => {
  if (value === undefined || value === null || value === '') return true;
  return !Number.isNaN(new Date(value).getTime());
};

export const validateWeekStartQuery = [
  query('weekStart')
    .optional()
    .custom(optionalDateOnly)
    .withMessage('weekStart must use YYYY-MM-DD'),
  handleValidationErrors,
];

export const validateAdminWeekQuery = [
  ...validateWeekStartQuery.slice(0, -1),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  query('activityType')
    .optional()
    .isIn([
      'event',
      'meeting',
      'training',
      'field_activity',
      'campaign',
      'survey',
      'research',
      'assignment',
      'other',
    ])
    .withMessage('Invalid activity type'),
  query('department').optional().trim().isLength({ max: 120 }),
  query('search').optional().trim().isLength({ max: 200 }),
  handleValidationErrors,
];

export const validateCreateWeeklyProgram = [
  body('weekStart')
    .notEmpty()
    .withMessage('weekStart is required')
    .custom(optionalDateOnly)
    .withMessage('weekStart must use YYYY-MM-DD'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('publicContactEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid public contact email')
    .normalizeEmail(),
  handleValidationErrors,
];

export const validateWeeklyProgramId = [
  param('id').custom(isValidObjectId).withMessage('Invalid weekly program ID'),
  handleValidationErrors,
];

export const validateUpdateWeeklyProgram = [
  ...validateWeeklyProgramId.slice(0, -1),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('publicContactEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid public contact email')
    .normalizeEmail(),
  handleValidationErrors,
];

export const validateWeeklyActivityId = [
  param('activityId')
    .custom(isValidObjectId)
    .withMessage('Invalid weekly activity ID'),
  handleValidationErrors,
];

const activityFieldRules = [
  body('source')
    .optional()
    .isIn(['standalone', 'event'])
    .withMessage('Invalid activity source'),
  body('eventId')
    .optional({ nullable: true })
    .custom((value) => value === null || value === '' || isValidObjectId(value))
    .withMessage('Invalid event ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('activityType')
    .optional()
    .isIn([
      'event',
      'meeting',
      'training',
      'field_activity',
      'campaign',
      'survey',
      'research',
      'assignment',
      'other',
    ])
    .withMessage('Invalid activity type'),
  body('project')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Project cannot exceed 160 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Department cannot exceed 160 characters'),
  body('referenceCode')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('Reference code cannot exceed 80 characters'),
  body('startDateTime')
    .optional({ nullable: true })
    .custom(looksLikeDate)
    .withMessage('Invalid start date/time'),
  body('endDateTime')
    .optional({ nullable: true })
    .custom(looksLikeDate)
    .withMessage('Invalid end date/time')
    .custom((value, { req }) => {
      if (!value || !req.body.startDateTime) return true;
      return new Date(value) > new Date(req.body.startDateTime);
    })
    .withMessage('End date/time must be after start date/time'),
  body('timezone').optional().trim().isLength({ max: 80 }),
  body('allDay').optional().isBoolean().withMessage('allDay must be a boolean'),
  body('venue.name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Venue name cannot exceed 200 characters'),
  body('venue.address')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Venue address cannot exceed 300 characters'),
  body('venue.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  body('venue.state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),
  body('venue.region')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Region cannot exceed 100 characters'),
  body('venue.country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters'),
  body('mode')
    .optional()
    .isIn(['physical', 'virtual', 'hybrid'])
    .withMessage('Invalid activity mode'),
  body('meetingUrl')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Meeting URL must be a valid http/https URL'),
  body('contact.name')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Contact name cannot exceed 120 characters'),
  body('contact.officialEmail')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid official email')
    .normalizeEmail(),
  body('contact.phone')
    .optional()
    .trim()
    .isLength({ max: 40 })
    .withMessage('Contact phone cannot exceed 40 characters'),
  body('contact.department')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Contact department cannot exceed 120 characters'),
  body('contact.publicEmail')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid public email')
    .normalizeEmail(),
  body('contact.publicPhone')
    .optional()
    .trim()
    .isLength({ max: 40 })
    .withMessage('Public phone cannot exceed 40 characters'),
  body('contact.showPublicContact')
    .optional()
    .isBoolean()
    .withMessage('showPublicContact must be a boolean'),
  body('internalNotes')
    .optional()
    .trim()
    .isLength({ max: 3000 })
    .withMessage('Internal notes cannot exceed 3000 characters'),
  body('visibility')
    .optional()
    .isIn(['public', 'authenticated', 'staff'])
    .withMessage('Invalid visibility'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  body('bannerImage')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }),
];

export const validateCreateWeeklyActivity = [
  ...activityFieldRules,
  body().custom((value, { req }) => {
    const source = req.body.source || 'standalone';
    if (source === 'event') {
      if (!req.body.eventId) {
        throw new Error('An eventId is required when linking an existing event');
      }
      return true;
    }

    if (!req.body.title) throw new Error('Title is required');
    if (!req.body.startDateTime || !req.body.endDateTime) {
      throw new Error('Start and end date/time are required');
    }
    if (!req.body.venue || !req.body.venue.name) {
      throw new Error('Venue name is required');
    }
    if (new Date(req.body.endDateTime) <= new Date(req.body.startDateTime)) {
      throw new Error('End date/time must be after start date/time');
    }
    return true;
  }),
  handleValidationErrors,
];

export const validateUpdateWeeklyActivity = [
  ...activityFieldRules,
  handleValidationErrors,
];

export const validateFromEvent = [
  body('eventId')
    .notEmpty()
    .withMessage('eventId is required')
    .custom(isValidObjectId)
    .withMessage('Invalid event ID'),
  body('visibility')
    .optional()
    .isIn(['public', 'authenticated', 'staff'])
    .withMessage('Invalid visibility'),
  handleValidationErrors,
];

export const validateSummaryQuery = [
  query('format')
    .optional()
    .isIn(['whatsapp', 'email'])
    .withMessage('format must be whatsapp or email'),
  handleValidationErrors,
];

export const validateExportQuery = [
  query('format')
    .optional()
    .isIn(['txt', 'html'])
    .withMessage('format must be txt or html'),
  handleValidationErrors,
];

export const validateNotifyWeeklyProgram = [
  body('confirm')
    .custom((value) => value === true)
    .withMessage('Recipient confirmation is required'),
  body('recipients')
    .isIn(['all_active', 'registered'])
    .withMessage('recipients must be all_active or registered'),
  body('channels')
    .optional()
    .isArray({ min: 1 })
    .withMessage('channels must be a non-empty array'),
  body('channels.*')
    .optional()
    .isIn(['inApp', 'email'])
    .withMessage('Only inApp and email channels are supported'),
  handleValidationErrors,
];

export const validateCreateTask = [
  body('weeklyActivityId')
    .optional({ nullable: true })
    .custom((value) => value === null || value === '' || isValidObjectId(value))
    .withMessage('Invalid weekly activity ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Task note cannot exceed 500 characters'),
  body('weekStart')
    .optional()
    .custom(optionalDateOnly)
    .withMessage('weekStart must use YYYY-MM-DD'),
  body('dueDate')
    .optional({ nullable: true })
    .custom(looksLikeDate)
    .withMessage('Invalid due date'),
  body().custom((value, { req }) => {
    if (!req.body.weeklyActivityId && !req.body.title) {
      throw new Error('Provide a weeklyActivityId or a task title');
    }
    if (!req.body.weeklyActivityId && !req.body.weekStart) {
      throw new Error('weekStart is required for a custom task');
    }
    return true;
  }),
  handleValidationErrors,
];

export const validateUpdateTask = [
  param('taskId').custom(isValidObjectId).withMessage('Invalid task ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Task note cannot exceed 500 characters'),
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('completed must be a boolean'),
  body('dueDate')
    .optional({ nullable: true })
    .custom(looksLikeDate)
    .withMessage('Invalid due date'),
  handleValidationErrors,
];

export const validateTaskId = [
  param('taskId').custom(isValidObjectId).withMessage('Invalid task ID'),
  handleValidationErrors,
];
