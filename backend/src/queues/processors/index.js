/**
 * Queue Processors Index
 * Initialize all queue processors
 */

import './email.processor.js';
import './sms.processor.js';
import './notification.processor.js';
import './certificate.processor.js';
import './analytics.processor.js';
import './scheduled.processor.js';

export { queueEmail, queueBulkEmails, EMAIL_JOB_TYPES } from './email.processor.js';
export { queueSMS, queueBulkSMS, SMS_JOB_TYPES } from './sms.processor.js';
export { queueNotification, queueBulkNotifications, NOTIFICATION_JOB_TYPES } from './notification.processor.js';
export { queueCertificate, queueBulkCertificates, CERTIFICATE_JOB_TYPES } from './certificate.processor.js';
export { queueAnalytics, ANALYTICS_JOB_TYPES } from './analytics.processor.js';
export { scheduleJob, setupRecurringJobs, SCHEDULED_JOB_TYPES } from './scheduled.processor.js';

import logger from '../../utils/logger.js';

logger.info('All queue processors initialized');
