import { Notification, User, Event } from '../models/index.js';
import { notificationService } from '../services/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Notification Controller
 * Handles user notifications and broadcasts.
 * Notification.userId and the flat User.preferences fields are canonical.
 */

const toId = (value) => (value?._id ? value._id.toString() : value?.toString());

/**
 * Accept either an array of channel names or a channel object and return the
 * schema-compatible `{ inApp, email, sms, push }` object.
 */
const buildChannels = (channels) => {
  const result = {
    inApp: { enabled: true },
    email: { enabled: false },
    sms: { enabled: false },
    push: { enabled: false },
  };

  if (!channels) return result;

  if (Array.isArray(channels)) {
    channels.forEach((channel) => {
      const name = String(channel).toLowerCase();
      if (name === 'in-app' || name === 'inapp' || name === 'in_app') {
        result.inApp.enabled = true;
      } else if (result[name]) {
        result[name].enabled = true;
      }
    });
    return result;
  }

  if (typeof channels === 'object') {
    ['inApp', 'email', 'sms', 'push'].forEach((channel) => {
      if (channels[channel] !== undefined) {
        result[channel].enabled =
          typeof channels[channel] === 'boolean'
            ? channels[channel]
            : channels[channel]?.enabled !== false;
      }
    });
  }

  return result;
};

const summarizeResults = (results = []) => ({
  totalSent: results.filter((result) => result.success).length,
  totalFailed: results.filter((result) => !result.success).length,
  details: results,
});

class NotificationController {
  /**
   * Get User Notifications
   * GET /api/v1/notifications
   */
  async getUserNotifications(req, res, next) {
    try {
      const { page = 1, limit = 20, unreadOnly, type } = req.query;

      const result = await notificationService.getUserNotifications(req.user.id, {
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 100),
        unreadOnly: unreadOnly === 'true',
        type,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Single Notification
   * GET /api/v1/notifications/:id
   */
  async getNotification(req, res, next) {
    try {
      const notification = await Notification.findById(req.params.id);

      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      if (
        req.userRole !== 'admin' &&
        toId(notification.userId) !== req.user.id.toString()
      ) {
        throw new AppError('Not authorized to view this notification', 403);
      }

      res.json({
        success: true,
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark Notification as Read
   * POST /api/v1/notifications/:id/mark-read
   */
  async markAsRead(req, res, next) {
    try {
      const notification = await notificationService.markAsRead(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark All Notifications as Read
   * POST /api/v1/notifications/mark-all
   */
  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user.id);
      const count = result.modifiedCount ?? result.nModified ?? 0;

      res.json({
        success: true,
        message: `${count} notification(s) marked as read`,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Notification
   * DELETE /api/v1/notifications/:id
   */
  async deleteNotification(req, res, next) {
    try {
      const notification = await Notification.findById(req.params.id);

      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      if (toId(notification.userId) !== req.user.id.toString()) {
        throw new AppError('Not authorized to delete this notification', 403);
      }

      await notification.deleteOne();

      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete All Notifications
   * DELETE /api/v1/notifications
   */
  async deleteAllNotifications(req, res, next) {
    try {
      const result = await Notification.deleteMany({ userId: req.user.id });

      res.json({
        success: true,
        message: `${result.deletedCount} notification(s) deleted`,
        data: { count: result.deletedCount },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Unread Count
   * GET /api/v1/notifications/unread/count
   */
  async getUnreadCount(req, res, next) {
    try {
      const count = await Notification.countDocuments({
        userId: req.user.id,
        read: false,
        status: { $ne: 'cancelled' },
      });

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send Broadcast Notification (Admin)
   * POST /api/v1/notifications/broadcast
   */
  async sendBroadcast(req, res, next) {
    try {
      const {
        title,
        message,
        type = 'announcement',
        userIds,
        channels,
      } = req.body;

      const query = { status: 'active' };
      if (Array.isArray(userIds) && userIds.length > 0) {
        query._id = { $in: userIds };
      }

      const users = await User.find(query);

      if (users.length === 0) {
        throw new AppError('No matching users found', 400);
      }

      const results = await notificationService.sendBulkNotifications(users, {
        title,
        message,
        type,
        channels: buildChannels(channels),
        sentBy: req.user.id,
      });

      logger.info(
        `Broadcast notification sent by admin ${req.user.id} to ${users.length} users`
      );

      res.json({
        success: true,
        message: 'Broadcast notification sent successfully',
        data: summarizeResults(results),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send Event Notification (Admin)
   * POST /api/v1/notifications/event/:eventId
   */
  async sendEventNotification(req, res, next) {
    try {
      const { eventId } = req.params;
      const { title, message, type = 'event_update', channels } = req.body;

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const userIds = event.registeredUsers
        .filter((registration) => registration.status === 'confirmed')
        .map((registration) => toId(registration.userId));

      if (userIds.length === 0) {
        throw new AppError('No users registered for this event', 400);
      }

      const users = await User.find({ _id: { $in: userIds } });

      const results = await notificationService.sendBulkNotifications(users, {
        title,
        message,
        type,
        relatedEvent: event._id,
        channels: buildChannels(channels || ['in-app', 'email']),
        sentBy: req.user.id,
      });

      res.json({
        success: true,
        message: 'Event notification sent successfully',
        data: summarizeResults(results),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send Reminder Notification (Admin)
   * POST /api/v1/notifications/reminder/:eventId
   */
  async sendEventReminder(req, res, next) {
    try {
      const { eventId } = req.params;

      const event = await Event.findById(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const attendedIds = new Set(
        event.attendedUsers.map((attendance) => toId(attendance.userId))
      );

      const userIds = event.registeredUsers
        .filter(
          (registration) =>
            registration.status === 'confirmed' &&
            !attendedIds.has(toId(registration.userId))
        )
        .map((registration) => toId(registration.userId));

      if (userIds.length === 0) {
        return res.json({
          success: true,
          message: 'No users to send reminders to',
          data: { totalSent: 0, totalFailed: 0, details: [] },
        });
      }

      const users = await User.find({ _id: { $in: userIds } });
      const results = [];

      for (const user of users) {
        try {
          await notificationService.sendEventReminder(user, event);
          results.push({ userId: user._id, success: true });
        } catch (error) {
          results.push({ userId: user._id, success: false, error: error.message });
        }
      }

      res.json({
        success: true,
        message: 'Event reminders sent successfully',
        data: summarizeResults(results),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Notification Statistics (Admin)
   * GET /api/v1/notifications/statistics
   */
  async getNotificationStatistics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const query = {};
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const [total, read, unread, byType, emailSent, smsSent, inAppSent] =
        await Promise.all([
          Notification.countDocuments(query),
          Notification.countDocuments({ ...query, read: true }),
          Notification.countDocuments({ ...query, read: false }),
          Notification.aggregate([
            { $match: query },
            { $group: { _id: '$type', count: { $sum: 1 } } },
          ]),
          Notification.countDocuments({ ...query, 'channels.email.sent': true }),
          Notification.countDocuments({ ...query, 'channels.sms.sent': true }),
          Notification.countDocuments({ ...query, 'channels.inApp.sent': true }),
        ]);

      const typeDistribution = {};
      byType.forEach((item) => {
        typeDistribution[item._id] = item.count;
      });

      res.json({
        success: true,
        data: {
          statistics: {
            total,
            read,
            unread,
            readRate: total > 0 ? ((read / total) * 100).toFixed(2) : 0,
            typeDistribution,
            channelDistribution: {
              inApp: inAppSent,
              email: emailSent,
              sms: smsSent,
            },
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test Notification (Admin)
   * POST /api/v1/notifications/test
   */
  async testNotification(req, res, next) {
    try {
      const { userId, type = 'system', channels, title, message } = req.body;

      const targetUserId = userId || req.user.id;
      const user = await User.findById(targetUserId);

      if (!user) {
        throw new AppError('Target user not found', 404);
      }

      const notification = await notificationService.createNotification({
        userId: user._id,
        type,
        title: title || 'Test Notification',
        message: message || 'This is a test notification from the system.',
        channels: buildChannels(channels || ['in-app']),
      });

      await notificationService.sendNotification(notification, user);

      res.json({
        success: true,
        message: 'Test notification sent successfully',
        data: { notification },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cleanup Expired Notifications (Admin)
   * POST /api/v1/notifications/cleanup
   */
  async cleanupExpired(req, res, next) {
    try {
      const count = await notificationService.cleanupExpiredNotifications();

      res.json({
        success: true,
        message: `${count} expired notification(s) cleaned up`,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Notification Preferences
   * GET /api/v1/notifications/preferences
   */
  async getPreferences(req, res, next) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: {
          preferences: {
            emailNotifications: user.preferences.emailNotifications,
            smsNotifications: user.preferences.smsNotifications,
            pushNotifications: user.preferences.pushNotifications,
            marketingEmails: user.preferences.marketingEmails,
            eventReminders: user.preferences.eventReminders,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update Notification Preferences
   * PUT /api/v1/notifications/preferences
   */
  async updatePreferences(req, res, next) {
    try {
      const body = req.body || {};
      const email = body.email ?? body.emailNotifications;
      const sms = body.sms ?? body.smsNotifications;
      const push = body.push ?? body.pushNotifications;

      const user = await User.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (email !== undefined) user.preferences.emailNotifications = email;
      if (sms !== undefined) user.preferences.smsNotifications = sms;
      if (push !== undefined) user.preferences.pushNotifications = push;
      if (body.marketingEmails !== undefined) {
        user.preferences.marketingEmails = body.marketingEmails;
      }

      await user.save();

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: {
          preferences: {
            emailNotifications: user.preferences.emailNotifications,
            smsNotifications: user.preferences.smsNotifications,
            pushNotifications: user.preferences.pushNotifications,
            marketingEmails: user.preferences.marketingEmails,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
