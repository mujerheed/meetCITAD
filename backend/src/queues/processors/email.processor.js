/**
 * Email Queue Processor
 * Process email sending jobs
 */

import { emailQueue } from '../index.js';
import { emailService } from '../../services/index.js';
import logger from '../../utils/logger.js';

/**
 * Email job types
 */
export const EMAIL_JOB_TYPES = {
  WELCOME: 'welcome',
  EVENT_REGISTRATION: 'event_registration',
  EVENT_REMINDER: 'event_reminder',
  EVENT_UPDATE: 'event_update',
  CERTIFICATE_READY: 'certificate_ready',
  PASSWORD_RESET: 'password_reset',
  FEEDBACK_REQUEST: 'feedback_request',
  CUSTOM: 'custom',
};

/**
 * Process email jobs
 */
emailQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`Processing email job [${job.id}]: ${type}`);

  try {
    let result;

    switch (type) {
      case EMAIL_JOB_TYPES.WELCOME:
        result = await emailService.sendWelcomeEmail(data);
        break;

      case EMAIL_JOB_TYPES.EVENT_REGISTRATION:
        result = await emailService.sendEventRegistrationEmail(data);
        break;

      case EMAIL_JOB_TYPES.EVENT_REMINDER:
        result = await emailService.sendEventReminder(data);
        break;

      case EMAIL_JOB_TYPES.EVENT_UPDATE:
        result = await emailService.sendEmail({
          to: data.to,
          subject: `Event Update: ${data.eventTitle}`,
          template: 'event-update',
          data,
        });
        break;

      case EMAIL_JOB_TYPES.CERTIFICATE_READY:
        result = await emailService.sendCertificateEmail(data);
        break;

      case EMAIL_JOB_TYPES.PASSWORD_RESET:
        result = await emailService.sendPasswordResetEmail(data);
        break;

      case EMAIL_JOB_TYPES.FEEDBACK_REQUEST:
        result = await emailService.sendFeedbackRequest(data);
        break;

      case EMAIL_JOB_TYPES.CUSTOM:
        result = await emailService.sendEmail(data);
        break;

      default:
        throw new Error(`Unknown email job type: ${type}`);
    }

    logger.info(`Email job [${job.id}] completed successfully`);
    return result;
  } catch (error) {
    logger.error(`Email job [${job.id}] failed:`, error);
    throw error;
  }
});

/**
 * Add email to queue
 */
export const queueEmail = async (type, data, options = {}) => {
  try {
    const job = await emailQueue.add(
      { type, data },
      {
        ...options,
        attempts: options.attempts || 5,
        backoff: options.backoff || {
          type: 'exponential',
          delay: 3000,
        },
      }
    );

    logger.info(`Email job queued [${job.id}]: ${type}`);
    return job;
  } catch (error) {
    logger.error(`Error queuing email job:`, error);
    throw error;
  }
};

/**
 * Queue bulk emails
 */
export const queueBulkEmails = async (emails) => {
  try {
    const jobs = emails.map(email => ({
      type: email.type || EMAIL_JOB_TYPES.CUSTOM,
      data: email.data,
    }));

    const result = await emailQueue.addBulk(
      jobs.map(job => ({ data: job }))
    );

    logger.info(`Queued ${result.length} bulk email jobs`);
    return result;
  } catch (error) {
    logger.error('Error queuing bulk emails:', error);
    throw error;
  }
};

export default {
  queueEmail,
  queueBulkEmails,
  EMAIL_JOB_TYPES,
};
