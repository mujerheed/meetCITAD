/**
 * SMS Queue Processor
 * Process SMS sending jobs
 */

import { smsQueue } from '../index.js';
import { smsService } from '../../services/index.js';
import logger from '../../utils/logger.js';

/**
 * SMS job types
 */
export const SMS_JOB_TYPES = {
  OTP: 'otp',
  EVENT_REGISTRATION: 'event_registration',
  EVENT_REMINDER: 'event_reminder',
  CERTIFICATE_READY: 'certificate_ready',
  PASSWORD_RESET: 'password_reset',
  CUSTOM: 'custom',
};

/**
 * Process SMS jobs
 */
smsQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`Processing SMS job [${job.id}]: ${type}`);

  try {
    let result;

    switch (type) {
      case SMS_JOB_TYPES.OTP:
        result = await smsService.sendOTP(data.phone, data.otp);
        break;

      case SMS_JOB_TYPES.EVENT_REGISTRATION:
        result = await smsService.sendEventRegistrationSMS(data);
        break;

      case SMS_JOB_TYPES.EVENT_REMINDER:
        result = await smsService.sendEventReminderSMS(data);
        break;

      case SMS_JOB_TYPES.CERTIFICATE_READY:
        result = await smsService.sendCertificateSMS(data);
        break;

      case SMS_JOB_TYPES.PASSWORD_RESET:
        result = await smsService.sendPasswordResetSMS(data);
        break;

      case SMS_JOB_TYPES.CUSTOM:
        result = await smsService.sendSMS(data.phone, data.message);
        break;

      default:
        throw new Error(`Unknown SMS job type: ${type}`);
    }

    logger.info(`SMS job [${job.id}] completed successfully`);
    return result;
  } catch (error) {
    logger.error(`SMS job [${job.id}] failed:`, error);
    throw error;
  }
});

/**
 * Add SMS to queue
 */
export const queueSMS = async (type, data, options = {}) => {
  try {
    const job = await smsQueue.add(
      { type, data },
      {
        ...options,
        attempts: options.attempts || 3,
        backoff: options.backoff || {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    logger.info(`SMS job queued [${job.id}]: ${type}`);
    return job;
  } catch (error) {
    logger.error(`Error queuing SMS job:`, error);
    throw error;
  }
};

/**
 * Queue bulk SMS
 */
export const queueBulkSMS = async (messages) => {
  try {
    const jobs = messages.map(msg => ({
      type: msg.type || SMS_JOB_TYPES.CUSTOM,
      data: msg.data,
    }));

    const result = await smsQueue.addBulk(
      jobs.map(job => ({ data: job }))
    );

    logger.info(`Queued ${result.length} bulk SMS jobs`);
    return result;
  } catch (error) {
    logger.error('Error queuing bulk SMS:', error);
    throw error;
  }
};

export default {
  queueSMS,
  queueBulkSMS,
  SMS_JOB_TYPES,
};
