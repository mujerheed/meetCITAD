/**
 * Notification Queue Processor
 * Process in-app notification creation and dispatch
 */

import { notificationQueue } from '../index.js';
import { notificationService } from '../../services/index.js';
import logger from '../../utils/logger.js';

/**
 * Notification job types
 */
export const NOTIFICATION_JOB_TYPES = {
  CREATE: 'create',
  EVENT_REGISTRATION: 'event_registration',
  EVENT_REMINDER: 'event_reminder',
  CERTIFICATE_READY: 'certificate_ready',
  FEEDBACK_REQUEST: 'feedback_request',
  BROADCAST: 'broadcast',
  BULK: 'bulk',
};

/**
 * Process notification jobs
 */
notificationQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`Processing notification job [${job.id}]: ${type}`);

  try {
    let result;

    switch (type) {
      case NOTIFICATION_JOB_TYPES.CREATE:
        result = await notificationService.createNotification(data);
        break;

      case NOTIFICATION_JOB_TYPES.EVENT_REGISTRATION:
        result = await notificationService.sendEventRegistrationNotification(
          data.userId,
          data.eventId
        );
        break;

      case NOTIFICATION_JOB_TYPES.EVENT_REMINDER:
        result = await notificationService.sendEventReminder(
          data.userId,
          data.eventId,
          data.reminderType
        );
        break;

      case NOTIFICATION_JOB_TYPES.CERTIFICATE_READY:
        result = await notificationService.sendCertificateNotification(
          data.userId,
          data.certificateId
        );
        break;

      case NOTIFICATION_JOB_TYPES.FEEDBACK_REQUEST:
        result = await notificationService.sendFeedbackRequest(
          data.userId,
          data.eventId
        );
        break;

      case NOTIFICATION_JOB_TYPES.BROADCAST:
        result = await notificationService.sendNotification({
          ...data,
          userId: null, // Broadcast to all
        });
        break;

      case NOTIFICATION_JOB_TYPES.BULK:
        result = await notificationService.sendBulkNotifications(data.notifications);
        break;

      default:
        throw new Error(`Unknown notification job type: ${type}`);
    }

    logger.info(`Notification job [${job.id}] completed successfully`);
    return result;
  } catch (error) {
    logger.error(`Notification job [${job.id}] failed:`, error);
    throw error;
  }
});

/**
 * Add notification to queue
 */
export const queueNotification = async (type, data, options = {}) => {
  try {
    const job = await notificationQueue.add(
      { type, data },
      {
        ...options,
        attempts: options.attempts || 3,
      }
    );

    logger.info(`Notification job queued [${job.id}]: ${type}`);
    return job;
  } catch (error) {
    logger.error(`Error queuing notification job:`, error);
    throw error;
  }
};

/**
 * Queue bulk notifications
 */
export const queueBulkNotifications = async (notifications) => {
  try {
    const jobs = notifications.map(notif => ({
      type: notif.type || NOTIFICATION_JOB_TYPES.CREATE,
      data: notif.data,
    }));

    const result = await notificationQueue.addBulk(
      jobs.map(job => ({ data: job }))
    );

    logger.info(`Queued ${result.length} bulk notification jobs`);
    return result;
  } catch (error) {
    logger.error('Error queuing bulk notifications:', error);
    throw error;
  }
};

export default {
  queueNotification,
  queueBulkNotifications,
  NOTIFICATION_JOB_TYPES,
};
