import { Notification, User } from '../models/index.js';
import { notificationService } from '../services/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Notification Controller
 * Handles user notifications and broadcasts
 */

class NotificationController {
  /**
   * Get User Notifications
   * GET /api/v1/notifications
   */
  async getUserNotifications(req, res, next) {
    try {
      const { page = 1, limit = 20, unreadOnly, type } = req.query;
      const userId = req.user.id;

      const result = await notificationService.getUserNotifications(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
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
      const { id } = req.params;

      const notification = await Notification.findById(id);
      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      // Check permission
      if (notification.user.toString() !== req.user.id && req.user.role !== 'admin') {
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
   * PUT /api/v1/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;

      const notification = await notificationService.markAsRead(id, req.user.id);

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
   * PUT /api/v1/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.id;

      const count = await notificationService.markAllAsRead(userId);

      logger.info(`All notifications marked as read for user: ${userId}`);

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
      const { id } = req.params;

      const notification = await Notification.findById(id);
      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      // Check permission
      if (notification.user.toString() !== req.user.id) {
        throw new AppError('Not authorized to delete this notification', 403);
      }

      await notification.deleteOne();

      logger.info(`Notification deleted: ${id} by user ${req.user.id}`);

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
      const userId = req.user.id;

      const result = await Notification.deleteMany({ user: userId });

      logger.info(`All notifications deleted for user: ${userId}`);

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
      const userId = req.user.id;

      const count = await Notification.countDocuments({
        user: userId,
        read: false,
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
      const { title, message, type = 'announcement', userIds, channels } = req.body;

      let targetUsers = [];

      if (userIds && userIds.length > 0) {
        // Send to specific users
        targetUsers = userIds;
      } else {
        // Send to all active users
        const users = await User.find({ status: 'active' }).select('_id');
        targetUsers = users.map((u) => u._id.toString());
      }

      const notifications = targetUsers.map((userId) => ({
        user: userId,
        type,
        title,
        message,
        channels: channels || ['in-app'],
      }));

      const result = await notificationService.sendBulkNotifications(notifications);

      logger.info(`Broadcast notification sent by admin ${req.user.id} to ${targetUsers.length} users`);

      res.json({
        success: true,
        message: 'Broadcast notification sent successfully',
        data: {
          totalSent: result.success.length,
          totalFailed: result.failed.length,
          details: result,
        },
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

      // Get all users registered for the event
      const users = await User.find({
        'registeredEvents.event': eventId,
      }).select('_id');

      if (users.length === 0) {
        throw new AppError('No users registered for this event', 400);
      }

      const notifications = users.map((user) => ({
        user: user._id,
        type,
        title,
        message,
        relatedEvent: eventId,
        channels: channels || ['in-app', 'email'],
      }));

      const result = await notificationService.sendBulkNotifications(notifications);

      logger.info(`Event notification sent by admin ${req.user.id} for event ${eventId} to ${users.length} users`);

      res.json({
        success: true,
        message: 'Event notification sent successfully',
        data: {
          totalSent: result.success.length,
          totalFailed: result.failed.length,
          details: result,
        },
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
      const { channels } = req.body;

      // Get all registered users who haven't attended
      const users = await User.find({
        'registeredEvents.event': eventId,
        'registeredEvents.attended': false,
      }).select('_id');

      if (users.length === 0) {
        return res.json({
          success: true,
          message: 'No users to send reminders to',
          data: { totalSent: 0 },
        });
      }

      const reminders = [];
      for (const user of users) {
        try {
          await notificationService.sendEventReminder(user._id.toString(), eventId, channels);
          reminders.push({ userId: user._id, success: true });
        } catch (error) {
          reminders.push({ userId: user._id, success: false, error: error.message });
        }
      }

      const successCount = reminders.filter((r) => r.success).length;

      logger.info(`Event reminder sent by admin ${req.user.id} for event ${eventId} to ${successCount} users`);

      res.json({
        success: true,
        message: 'Event reminders sent successfully',
        data: {
          totalSent: successCount,
          totalFailed: reminders.length - successCount,
          details: reminders,
        },
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

      const [total, read, unread, byType, byChannel] = await Promise.all([
        Notification.countDocuments(query),
        Notification.countDocuments({ ...query, read: true }),
        Notification.countDocuments({ ...query, read: false }),
        Notification.aggregate([
          { $match: query },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),
        Notification.aggregate([
          { $match: query },
          { $unwind: '$channels' },
          { $group: { _id: '$channels', count: { $sum: 1 } } },
        ]),
      ]);

      const typeDistribution = {};
      byType.forEach((item) => {
        typeDistribution[item._id] = item.count;
      });

      const channelDistribution = {};
      byChannel.forEach((item) => {
        channelDistribution[item._id] = item.count;
      });

      const stats = {
        total,
        read,
        unread,
        readRate: total > 0 ? ((read / total) * 100).toFixed(2) : 0,
        typeDistribution,
        channelDistribution,
      };

      res.json({
        success: true,
        data: { statistics: stats },
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
      const { userId, type, channels, title, message } = req.body;

      const targetUserId = userId || req.user.id;

      await notificationService.sendNotification({
        user: targetUserId,
        type: type || 'system',
        title: title || 'Test Notification',
        message: message || 'This is a test notification from the system.',
        channels: channels || ['in-app'],
      });

      logger.info(`Test notification sent by admin ${req.user.id} to user ${targetUserId}`);

      res.json({
        success: true,
        message: 'Test notification sent successfully',
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

      logger.info(`Expired notifications cleaned up: ${count} by admin ${req.user.id}`);

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
      const user = await User.findById(req.user.id).select('preferences.notifications');

      res.json({
        success: true,
        data: {
          preferences: user.preferences.notifications,
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
      const { email, sms, push } = req.body;

      const user = await User.findById(req.user.id);

      if (email !== undefined) user.preferences.notifications.email = email;
      if (sms !== undefined) user.preferences.notifications.sms = sms;
      if (push !== undefined) user.preferences.notifications.push = push;

      await user.save();

      logger.info(`Notification preferences updated for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: {
          preferences: user.preferences.notifications,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
