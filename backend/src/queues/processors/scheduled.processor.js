/**
 * Scheduled Jobs Processor
 * Process scheduled and recurring jobs
 */

import { scheduledQueue } from '../index.js';
import { queueEmail } from './email.processor.js';
import { queueNotification } from './notification.processor.js';
import { queueAnalytics } from './analytics.processor.js';
import { EMAIL_JOB_TYPES } from './email.processor.js';
import { NOTIFICATION_JOB_TYPES } from './notification.processor.js';
import { ANALYTICS_JOB_TYPES } from './analytics.processor.js';
import { Event, User, Notification } from '../../models/index.js';
import logger from '../../utils/logger.js';

/**
 * Scheduled job types
 */
export const SCHEDULED_JOB_TYPES = {
  EVENT_REMINDER_24H: 'event_reminder_24h',
  EVENT_REMINDER_1H: 'event_reminder_1h',
  FEEDBACK_REQUEST: 'feedback_request',
  CLEANUP_NOTIFICATIONS: 'cleanup_notifications',
  DAILY_ANALYTICS: 'daily_analytics',
  WEEKLY_ANALYTICS: 'weekly_analytics',
  MONTHLY_ANALYTICS: 'monthly_analytics',
};

/**
 * Process scheduled jobs
 */
scheduledQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`Processing scheduled job [${job.id}]: ${type}`);

  try {
    let result;

    switch (type) {
      case SCHEDULED_JOB_TYPES.EVENT_REMINDER_24H: {
        // Send reminders for events starting in 24 hours
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);
        
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(tomorrowEnd.getHours() + 1);

        const upcomingEvents = await Event.find({
          date: { $gte: tomorrow, $lt: tomorrowEnd },
          status: 'published',
        });

        const reminderJobs = [];

        for (const event of upcomingEvents) {
          // Get registered users
          const users = await User.find({
            'registeredEvents.event': event._id,
            'registeredEvents.status': 'registered',
          });

          for (const user of users) {
            // Queue email reminder
            reminderJobs.push(
              queueEmail(EMAIL_JOB_TYPES.EVENT_REMINDER, {
                to: user.email,
                name: user.firstName,
                eventTitle: event.title,
                eventDate: event.date,
                eventVenue: event.venue,
                reminderType: '24h',
              })
            );

            // Queue in-app notification
            reminderJobs.push(
              queueNotification(NOTIFICATION_JOB_TYPES.EVENT_REMINDER, {
                userId: user._id,
                eventId: event._id,
                reminderType: '24h',
              })
            );
          }
        }

        result = await Promise.all(reminderJobs);
        logger.info(`Sent ${reminderJobs.length} 24h event reminders`);
        break;
      }

      case SCHEDULED_JOB_TYPES.EVENT_REMINDER_1H: {
        // Send reminders for events starting in 1 hour
        const oneHourFromNow = new Date();
        oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
        
        const oneHourEnd = new Date(oneHourFromNow);
        oneHourEnd.setMinutes(oneHourEnd.getMinutes() + 15);

        const upcomingEvents = await Event.find({
          date: { $gte: oneHourFromNow, $lt: oneHourEnd },
          status: 'published',
        });

        const reminderJobs = [];

        for (const event of upcomingEvents) {
          const users = await User.find({
            'registeredEvents.event': event._id,
            'registeredEvents.status': 'registered',
          });

          for (const user of users) {
            // Only send in-app notification for 1h reminder (not email/SMS to avoid spam)
            reminderJobs.push(
              queueNotification(NOTIFICATION_JOB_TYPES.EVENT_REMINDER, {
                userId: user._id,
                eventId: event._id,
                reminderType: '1h',
              })
            );
          }
        }

        result = await Promise.all(reminderJobs);
        logger.info(`Sent ${reminderJobs.length} 1h event reminders`);
        break;
      }

      case SCHEDULED_JOB_TYPES.FEEDBACK_REQUEST: {
        // Send feedback requests for completed events
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const completedEvents = await Event.find({
          date: { $gte: yesterday, $lt: new Date() },
          status: 'published',
        });

        const feedbackJobs = [];

        for (const event of completedEvents) {
          const users = await User.find({
            'registeredEvents.event': event._id,
            'registeredEvents.attended': true,
          });

          for (const user of users) {
            feedbackJobs.push(
              queueEmail(EMAIL_JOB_TYPES.FEEDBACK_REQUEST, {
                to: user.email,
                name: user.firstName,
                eventTitle: event.title,
                eventId: event._id,
              })
            );

            feedbackJobs.push(
              queueNotification(NOTIFICATION_JOB_TYPES.FEEDBACK_REQUEST, {
                userId: user._id,
                eventId: event._id,
              })
            );
          }
        }

        result = await Promise.all(feedbackJobs);
        logger.info(`Sent ${feedbackJobs.length} feedback requests`);
        break;
      }

      case SCHEDULED_JOB_TYPES.CLEANUP_NOTIFICATIONS: {
        // Clean up expired notifications
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deleteResult = await Notification.deleteMany({
          createdAt: { $lt: thirtyDaysAgo },
          read: true,
        });

        result = {
          deletedCount: deleteResult.deletedCount,
        };

        logger.info(`Cleaned up ${result.deletedCount} old notifications`);
        break;
      }

      case SCHEDULED_JOB_TYPES.DAILY_ANALYTICS: {
        // Queue daily analytics report
        result = await queueAnalytics(ANALYTICS_JOB_TYPES.DAILY_REPORT);
        logger.info('Daily analytics report queued');
        break;
      }

      case SCHEDULED_JOB_TYPES.WEEKLY_ANALYTICS: {
        // Queue weekly analytics report
        result = await queueAnalytics(ANALYTICS_JOB_TYPES.WEEKLY_REPORT);
        logger.info('Weekly analytics report queued');
        break;
      }

      case SCHEDULED_JOB_TYPES.MONTHLY_ANALYTICS: {
        // Queue monthly analytics report
        result = await queueAnalytics(ANALYTICS_JOB_TYPES.MONTHLY_REPORT);
        logger.info('Monthly analytics report queued');
        break;
      }

      default:
        throw new Error(`Unknown scheduled job type: ${type}`);
    }

    logger.info(`Scheduled job [${job.id}] completed successfully`);
    return result;
  } catch (error) {
    logger.error(`Scheduled job [${job.id}] failed:`, error);
    throw error;
  }
});

/**
 * Schedule a job
 */
export const scheduleJob = async (type, data = {}, options = {}) => {
  try {
    const job = await scheduledQueue.add(
      { type, data },
      {
        ...options,
        attempts: options.attempts || 2,
      }
    );

    logger.info(`Scheduled job queued [${job.id}]: ${type}`);
    return job;
  } catch (error) {
    logger.error(`Error scheduling job:`, error);
    throw error;
  }
};

/**
 * Schedule recurring jobs
 */
export const setupRecurringJobs = async () => {
  logger.info('Setting up recurring jobs...');

  try {
    // Event reminders - check every 15 minutes
    await scheduledQueue.add(
      { type: SCHEDULED_JOB_TYPES.EVENT_REMINDER_24H },
      {
        repeat: {
          cron: '*/15 * * * *', // Every 15 minutes
        },
        jobId: 'event-reminder-24h',
      }
    );

    await scheduledQueue.add(
      { type: SCHEDULED_JOB_TYPES.EVENT_REMINDER_1H },
      {
        repeat: {
          cron: '*/15 * * * *', // Every 15 minutes
        },
        jobId: 'event-reminder-1h',
      }
    );

    // Feedback requests - check daily at 10 AM
    await scheduledQueue.add(
      { type: SCHEDULED_JOB_TYPES.FEEDBACK_REQUEST },
      {
        repeat: {
          cron: '0 10 * * *', // Daily at 10 AM
        },
        jobId: 'feedback-request',
      }
    );

    // Cleanup notifications - daily at 2 AM
    await scheduledQueue.add(
      { type: SCHEDULED_JOB_TYPES.CLEANUP_NOTIFICATIONS },
      {
        repeat: {
          cron: '0 2 * * *', // Daily at 2 AM
        },
        jobId: 'cleanup-notifications',
      }
    );

    // Daily analytics - every day at 1 AM
    await scheduledQueue.add(
      { type: SCHEDULED_JOB_TYPES.DAILY_ANALYTICS },
      {
        repeat: {
          cron: '0 1 * * *', // Daily at 1 AM
        },
        jobId: 'daily-analytics',
      }
    );

    // Weekly analytics - every Monday at 3 AM
    await scheduledQueue.add(
      { type: SCHEDULED_JOB_TYPES.WEEKLY_ANALYTICS },
      {
        repeat: {
          cron: '0 3 * * 1', // Every Monday at 3 AM
        },
        jobId: 'weekly-analytics',
      }
    );

    // Monthly analytics - 1st day of month at 4 AM
    await scheduledQueue.add(
      { type: SCHEDULED_JOB_TYPES.MONTHLY_ANALYTICS },
      {
        repeat: {
          cron: '0 4 1 * *', // 1st of month at 4 AM
        },
        jobId: 'monthly-analytics',
      }
    );

    logger.info('All recurring jobs set up successfully');
  } catch (error) {
    logger.error('Error setting up recurring jobs:', error);
    throw error;
  }
};

export default {
  scheduleJob,
  setupRecurringJobs,
  SCHEDULED_JOB_TYPES,
};
