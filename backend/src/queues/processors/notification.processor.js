/**
 * Notification Queue Processor
 * Process in-app notification creation and dispatch
 */

import { notificationQueue } from '../index.js';
import { notificationService } from '../../services/index.js';
import { User, Event, Certificate } from '../../models/index.js';
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

const requireDocuments = async (data) => {
  const [user, event] = await Promise.all([
    data.userId ? User.findById(data.userId) : null,
    data.eventId ? Event.findById(data.eventId) : null,
  ]);

  if (data.userId && !user) throw new Error('User not found');
  if (data.eventId && !event) throw new Error('Event not found');

  return { user, event };
};

notificationQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`Processing notification job [${job.id}]: ${type}`);

  try {
    let result;

    switch (type) {
      case NOTIFICATION_JOB_TYPES.CREATE:
        result = await notificationService.createNotification(data);
        break;

      case NOTIFICATION_JOB_TYPES.EVENT_REGISTRATION: {
        const { user, event } = await requireDocuments(data);
        result = await notificationService.sendEventRegistrationNotification(
          user,
          event,
          data.qrCodeUrl
        );
        break;
      }

      case NOTIFICATION_JOB_TYPES.EVENT_REMINDER: {
        const { user, event } = await requireDocuments(data);
        result = await notificationService.sendEventReminder(user, event);
        break;
      }

      case NOTIFICATION_JOB_TYPES.CERTIFICATE_READY: {
        const certificate = data.certificateId
          ? await Certificate.findById(data.certificateId)
          : null;
        const user = data.userId ? await User.findById(data.userId) : null;
        const event = certificate?.eventId
          ? await Event.findById(certificate.eventId)
          : data.eventId
            ? await Event.findById(data.eventId)
            : null;

        if (!user || !event) throw new Error('User or event not found');

        result = await notificationService.sendCertificateNotification(
          user,
          event,
          certificate?.fileUrl || data.certificateUrl
        );
        break;
      }

      case NOTIFICATION_JOB_TYPES.FEEDBACK_REQUEST: {
        const { user, event } = await requireDocuments(data);
        result = await notificationService.sendFeedbackRequest(user, event);
        break;
      }

      case NOTIFICATION_JOB_TYPES.BROADCAST: {
        const users = await User.find({ status: 'active' });
        result = await notificationService.sendBulkNotifications(users, {
          title: data.title,
          message: data.message,
          type: data.type || 'announcement',
          channels: data.channels || { inApp: { enabled: true } },
          sentBy: data.sentBy,
        });
        break;
      }

      case NOTIFICATION_JOB_TYPES.BULK: {
        const entries = data.notifications || [];
        result = [];
        for (const entry of entries) {
          const user = await User.findById(entry.userId);
          if (!user) continue;
          const notification = await notificationService.createNotification({
            ...entry,
            userId: user._id,
          });
          await notificationService.sendNotification(notification, user);
          result.push({ userId: user._id, success: true });
        }
        break;
      }

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
    logger.error('Error queuing bulk notification jobs:', error);
    throw error;
  }
};

export default {
  queueNotification,
  queueBulkNotifications,
  NOTIFICATION_JOB_TYPES,
};
