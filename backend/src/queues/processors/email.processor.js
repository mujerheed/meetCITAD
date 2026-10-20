/**
 * Email Queue Processor
 * Process email sending jobs
 */

import { emailQueue } from '../index.js';
import { emailService } from '../../services/index.js';
import { User, Event, Certificate } from '../../models/index.js';
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

const resolveUser = async (data) =>
  data.userId ? User.findById(data.userId) : null;

const resolveEvent = async (data) =>
  data.eventId ? Event.findById(data.eventId) : null;

/**
 * Process email jobs
 */
emailQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`Processing email job [${job.id}]: ${type}`);

  try {
    let result;

    switch (type) {
      case EMAIL_JOB_TYPES.WELCOME: {
        const user = await resolveUser(data);
        if (!user) throw new Error('User not found');
        result = await emailService.sendOTPEmail(user, data.otp || data.verificationCode);
        break;
      }

      case EMAIL_JOB_TYPES.EVENT_REGISTRATION: {
        const [user, event] = await Promise.all([resolveUser(data), resolveEvent(data)]);
        if (!user || !event) throw new Error('User or event not found');
        result = await emailService.sendEventRegistrationEmail(
          user,
          event,
          data.qrCodeUrl
        );
        break;
      }

      case EMAIL_JOB_TYPES.EVENT_REMINDER: {
        const [user, event] = await Promise.all([resolveUser(data), resolveEvent(data)]);
        if (!user || !event) throw new Error('User or event not found');
        result = await emailService.sendEventReminder(user, event);
        break;
      }

      case EMAIL_JOB_TYPES.EVENT_UPDATE:
        result = await emailService.sendEmail({
          to: data.to,
          subject: `Event Update: ${data.eventTitle}`,
          html: data.html,
          text: data.text || `Update for ${data.eventTitle}`,
        });
        break;

      case EMAIL_JOB_TYPES.CERTIFICATE_READY: {
        const certificate = data.certificateId
          ? await Certificate.findById(data.certificateId)
          : null;
        const user = await resolveUser(data);
        const event = certificate?.eventId
          ? await Event.findById(certificate.eventId)
          : await resolveEvent(data);

        if (!user || !event) throw new Error('User or event not found');

        result = await emailService.sendCertificateEmail(
          user,
          event,
          certificate?.fileUrl || data.certificateUrl
        );
        break;
      }

      case EMAIL_JOB_TYPES.PASSWORD_RESET: {
        const user = await resolveUser(data);
        if (!user) throw new Error('User not found');
        result = await emailService.sendPasswordResetEmail(user, data.resetToken);
        break;
      }

      case EMAIL_JOB_TYPES.FEEDBACK_REQUEST: {
        const [user, event] = await Promise.all([resolveUser(data), resolveEvent(data)]);
        if (!user || !event) throw new Error('User or event not found');
        result = await emailService.sendFeedbackRequest(user, event);
        break;
      }

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
    logger.error('Error queuing bulk email jobs:', error);
    throw error;
  }
};

export default {
  queueEmail,
  queueBulkEmails,
  EMAIL_JOB_TYPES,
};
