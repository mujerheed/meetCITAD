/**
 * Analytics Queue Processor
 * Process analytics and reporting jobs
 */

import { analyticsQueue } from '../index.js';
import { Event, User, Certificate, Feedback } from '../../models/index.js';
import logger from '../../utils/logger.js';

/**
 * Analytics job types
 */
export const ANALYTICS_JOB_TYPES = {
  EVENT_STATS: 'event_stats',
  USER_STATS: 'user_stats',
  CERTIFICATE_STATS: 'certificate_stats',
  FEEDBACK_STATS: 'feedback_stats',
  DAILY_REPORT: 'daily_report',
  WEEKLY_REPORT: 'weekly_report',
  MONTHLY_REPORT: 'monthly_report',
};

/**
 * Process analytics jobs
 */
analyticsQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`Processing analytics job [${job.id}]: ${type}`);

  try {
    let result;

    switch (type) {
      case ANALYTICS_JOB_TYPES.EVENT_STATS: {
        // Calculate event statistics
        const event = await Event.findById(data.eventId);
        if (event) {
          result = {
            eventId: data.eventId,
            totalRegistrations: event.registeredCount,
            totalAttendance: event.attendedCount,
            attendanceRate: event.registeredCount > 0
              ? (event.attendedCount / event.registeredCount * 100).toFixed(2)
              : 0,
            certificatesIssued: event.certificatesIssued || 0,
          };
        }
        break;
      }

      case ANALYTICS_JOB_TYPES.USER_STATS: {
        // Calculate user statistics
        const user = await User.findById(data.userId);
        if (user) {
          result = {
            userId: data.userId,
            totalRegistrations: user.registeredEvents.length,
            attendedEvents: user.registeredEvents.filter(e => e.attended).length,
            certificatesEarned: user.registeredEvents.filter(e => e.certificateIssued).length,
          };
        }
        break;
      }

      case ANALYTICS_JOB_TYPES.CERTIFICATE_STATS: {
        // Calculate certificate statistics
        const [total, issued, revoked] = await Promise.all([
          Certificate.countDocuments(),
          Certificate.countDocuments({ status: 'issued' }),
          Certificate.countDocuments({ status: 'revoked' }),
        ]);

        result = {
          total,
          issued,
          revoked,
          issuedRate: total > 0 ? (issued / total * 100).toFixed(2) : 0,
        };
        break;
      }

      case ANALYTICS_JOB_TYPES.FEEDBACK_STATS: {
        // Calculate feedback statistics
        const query = data.eventId ? { event: data.eventId } : {};
        
        const feedbacks = await Feedback.find(query);
        
        if (feedbacks.length > 0) {
          const totalRatings = feedbacks.reduce((sum, f) => sum + f.ratings.overall, 0);
          const avgRating = totalRatings / feedbacks.length;
          
          const npsScores = feedbacks
            .filter(f => f.npsScore !== undefined)
            .map(f => f.npsScore);
          
          let nps = 0;
          if (npsScores.length > 0) {
            const promoters = npsScores.filter(s => s >= 9).length;
            const detractors = npsScores.filter(s => s <= 6).length;
            nps = ((promoters - detractors) / npsScores.length * 100).toFixed(2);
          }

          result = {
            totalFeedback: feedbacks.length,
            averageRating: avgRating.toFixed(2),
            nps,
            satisfactionRate: (feedbacks.filter(f => f.ratings.overall >= 4).length / feedbacks.length * 100).toFixed(2),
          };
        }
        break;
      }

      case ANALYTICS_JOB_TYPES.DAILY_REPORT: {
        // Generate daily report
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [newUsers, newEvents, newCertificates, newFeedback] = await Promise.all([
          User.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
          Event.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
          Certificate.countDocuments({ issuedAt: { $gte: today, $lt: tomorrow } }),
          Feedback.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
        ]);

        result = {
          date: today.toISOString(),
          newUsers,
          newEvents,
          newCertificates,
          newFeedback,
        };
        break;
      }

      case ANALYTICS_JOB_TYPES.WEEKLY_REPORT: {
        // Generate weekly report
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);

        const [newUsers, newEvents, activeEvents, certificates] = await Promise.all([
          User.countDocuments({ createdAt: { $gte: weekStart } }),
          Event.countDocuments({ createdAt: { $gte: weekStart } }),
          Event.countDocuments({ 
            date: { $gte: weekStart },
            status: 'published',
          }),
          Certificate.countDocuments({ issuedAt: { $gte: weekStart } }),
        ]);

        result = {
          weekStart: weekStart.toISOString(),
          newUsers,
          newEvents,
          activeEvents,
          certificates,
        };
        break;
      }

      case ANALYTICS_JOB_TYPES.MONTHLY_REPORT: {
        // Generate monthly report
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const [totalUsers, totalEvents, totalCertificates, totalFeedback] = await Promise.all([
          User.countDocuments(),
          Event.countDocuments(),
          Certificate.countDocuments(),
          Feedback.countDocuments(),
        ]);

        const [monthUsers, monthEvents, monthCertificates, monthFeedback] = await Promise.all([
          User.countDocuments({ createdAt: { $gte: monthStart } }),
          Event.countDocuments({ createdAt: { $gte: monthStart } }),
          Certificate.countDocuments({ issuedAt: { $gte: monthStart } }),
          Feedback.countDocuments({ createdAt: { $gte: monthStart } }),
        ]);

        result = {
          month: monthStart.toISOString(),
          totals: {
            users: totalUsers,
            events: totalEvents,
            certificates: totalCertificates,
            feedback: totalFeedback,
          },
          monthly: {
            users: monthUsers,
            events: monthEvents,
            certificates: monthCertificates,
            feedback: monthFeedback,
          },
        };
        break;
      }

      default:
        throw new Error(`Unknown analytics job type: ${type}`);
    }

    logger.info(`Analytics job [${job.id}] completed successfully`);
    return result;
  } catch (error) {
    logger.error(`Analytics job [${job.id}] failed:`, error);
    throw error;
  }
});

/**
 * Add analytics job to queue
 */
export const queueAnalytics = async (type, data = {}, options = {}) => {
  try {
    const job = await analyticsQueue.add(
      { type, data },
      {
        ...options,
        attempts: options.attempts || 2,
      }
    );

    logger.info(`Analytics job queued [${job.id}]: ${type}`);
    return job;
  } catch (error) {
    logger.error(`Error queuing analytics job:`, error);
    throw error;
  }
};

export default {
  queueAnalytics,
  ANALYTICS_JOB_TYPES,
};
