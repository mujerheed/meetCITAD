import { Notification } from '../models/index.js';
import emailService from './email.service.js';
import smsService from './sms.service.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Notification Service
 * Multi-channel notification dispatcher (in-app, email, SMS, push)
 */

class NotificationService {
  /**
   * Create notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} - Created notification
   */
  async createNotification(notificationData) {
    try {
      const notification = await Notification.create(notificationData);
      logger.info(`Notification created: ${notification._id}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw new AppError('Failed to create notification', 500);
    }
  }

  /**
   * Send notification through all enabled channels
   * @param {Object} notification - Notification object
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Send results
   */
  async sendNotification(notification, user) {
    const results = {
      inApp: false,
      email: false,
      sms: false,
      push: false,
    };

    try {
      // In-app notification (always enabled)
      if (notification.channels.inApp.enabled) {
        results.inApp = true;
        await notification.markChannelSent('inApp');
      }

      // Email notification
      if (notification.channels.email.enabled && user.email) {
        try {
          await this.sendEmailNotification(notification, user);
          results.email = true;
          await notification.markChannelSent('email');
        } catch (error) {
          logger.error('Email notification failed:', error);
          await notification.markChannelFailed('email', error.message);
        }
      }

      // SMS notification
      if (notification.channels.sms.enabled && user.phone) {
        try {
          await this.sendSMSNotification(notification, user);
          results.sms = true;
          await notification.markChannelSent('sms');
        } catch (error) {
          logger.error('SMS notification failed:', error);
          await notification.markChannelFailed('sms', error.message);
        }
      }

      // Push notification (placeholder for future implementation)
      if (notification.channels.push.enabled) {
        try {
          // TODO: Implement push notification with FCM or similar
          results.push = false;
          logger.info('Push notifications not yet implemented');
        } catch (error) {
          logger.error('Push notification failed:', error);
          await notification.markChannelFailed('push', error.message);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   * @param {Object} notification - Notification object
   * @param {Object} user - User object
   * @returns {Promise<Object>}
   */
  async sendEmailNotification(notification, user) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${notification.title}</h1>
          </div>
          <div class="content">
            <p>Hello ${user.fullname},</p>
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<a href="${notification.actionUrl}" class="button">${notification.actionLabel || 'View Details'}</a>` : ''}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CITAD. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return emailService.sendEmail({
      to: user.email,
      subject: notification.title,
      text: notification.message,
      html,
    });
  }

  /**
   * Send SMS notification
   * @param {Object} notification - Notification object
   * @param {Object} user - User object
   * @returns {Promise<Object>}
   */
  async sendSMSNotification(notification, user) {
    const message = notification.shortMessage || notification.message.substring(0, 157) + '...';
    return smsService.sendSMS(user.phone, message);
  }

  /**
   * Send event registration notification
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @param {string} qrCodeUrl - QR code URL
   * @returns {Promise<Object>}
   */
  async sendEventRegistrationNotification(user, event, qrCodeUrl) {
    // Create in-app notification
    const notification = await this.createNotification({
      userId: user._id,
      title: 'Registration Confirmed',
      message: `You have successfully registered for "${event.title}". Check your email for your QR ticket.`,
      type: 'registration_confirmation',
      relatedEvent: event._id,
      channels: {
        inApp: { enabled: true },
        email: { enabled: user.preferences?.notifications?.email !== false },
        sms: { enabled: user.preferences?.notifications?.sms === true },
      },
      priority: 'high',
    });

    // Send through channels
    const results = await this.sendNotification(notification, user);

    // Send dedicated email with QR code
    if (user.preferences?.notifications?.email !== false) {
      await emailService.sendEventRegistrationEmail(user, event, qrCodeUrl);
    }

    // Send SMS if enabled
    if (user.preferences?.notifications?.sms === true && user.phone) {
      await smsService.sendEventRegistrationSMS(
        user.phone,
        user.fullname,
        event.title,
        event.startDateTime
      );
    }

    return { notification, results };
  }

  /**
   * Send event reminder
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @returns {Promise<Object>}
   */
  async sendEventReminder(user, event) {
    const notification = await this.createNotification({
      userId: user._id,
      title: 'Event Reminder',
      message: `Reminder: "${event.title}" is coming up soon. Don't forget to bring your QR code!`,
      type: 'event_reminder',
      relatedEvent: event._id,
      channels: {
        inApp: { enabled: true },
        email: { enabled: user.preferences?.notifications?.email !== false },
        sms: { enabled: user.preferences?.notifications?.sms === true },
      },
      priority: 'normal',
    });

    const results = await this.sendNotification(notification, user);

    // Send dedicated reminder emails/SMS
    if (user.preferences?.notifications?.email !== false) {
      await emailService.sendEventReminder(user, event);
    }

    if (user.preferences?.notifications?.sms === true && user.phone) {
      await smsService.sendEventReminderSMS(
        user.phone,
        user.fullname,
        event.title,
        event.startDateTime
      );
    }

    return { notification, results };
  }

  /**
   * Send certificate ready notification
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @param {string} certificateUrl - Certificate URL
   * @returns {Promise<Object>}
   */
  async sendCertificateNotification(user, event, certificateUrl) {
    const notification = await this.createNotification({
      userId: user._id,
      title: 'Certificate Ready',
      message: `Your certificate for "${event.title}" is now available for download.`,
      type: 'certificate_ready',
      relatedEvent: event._id,
      actionUrl: `/certificates/${certificateUrl}`,
      actionLabel: 'Download Certificate',
      channels: {
        inApp: { enabled: true },
        email: { enabled: user.preferences?.notifications?.email !== false },
        sms: { enabled: user.preferences?.notifications?.sms === true },
      },
      priority: 'normal',
    });

    const results = await this.sendNotification(notification, user);

    // Send dedicated emails/SMS
    if (user.preferences?.notifications?.email !== false) {
      await emailService.sendCertificateEmail(user, event, certificateUrl);
    }

    if (user.preferences?.notifications?.sms === true && user.phone) {
      await smsService.sendCertificateSMS(user.phone, user.fullname, event.title);
    }

    return { notification, results };
  }

  /**
   * Send feedback request
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @returns {Promise<Object>}
   */
  async sendFeedbackRequest(user, event) {
    const notification = await this.createNotification({
      userId: user._id,
      title: 'Share Your Feedback',
      message: `We'd love to hear about your experience at "${event.title}". Your feedback helps us improve!`,
      type: 'feedback_request',
      relatedEvent: event._id,
      actionUrl: `/events/${event._id}/feedback`,
      actionLabel: 'Give Feedback',
      channels: {
        inApp: { enabled: true },
        email: { enabled: user.preferences?.notifications?.email !== false },
      },
      priority: 'low',
    });

    const results = await this.sendNotification(notification, user);

    // Send email
    if (user.preferences?.notifications?.email !== false) {
      await emailService.sendFeedbackRequest(user, event);
    }

    return { notification, results };
  }

  /**
   * Send bulk notifications
   * @param {Array} users - Array of user objects
   * @param {Object} notificationData - Notification template data
   * @returns {Promise<Array>} - Array of results
   */
  async sendBulkNotifications(users, notificationData) {
    const results = [];
    const batchId = `batch-${Date.now()}`;

    for (const user of users) {
      try {
        const notification = await this.createNotification({
          ...notificationData,
          userId: user._id,
          batchId,
          isBulk: true,
        });

        const sendResults = await this.sendNotification(notification, user);

        results.push({
          userId: user._id,
          success: true,
          notificationId: notification._id,
          channels: sendResults,
        });
      } catch (error) {
        logger.error(`Failed to send notification to user ${user._id}:`, error);
        results.push({
          userId: user._id,
          success: false,
          error: error.message,
        });
      }
    }

    logger.info(`Sent ${results.filter(r => r.success).length}/${users.length} bulk notifications`);
    return results;
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Notifications and metadata
   */
  async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type = null,
    } = options;

    const query = { userId, status: 'sent' };

    if (unreadOnly) {
      query.read = false;
    }

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('relatedEvent', 'title startDateTime')
        .lean(),
      Notification.countDocuments(query),
      Notification.getUnreadCount(userId),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for verification)
   * @returns {Promise<Object>}
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    await notification.markAsRead();
    return notification;
  }

  /**
   * Mark all notifications as read
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  async markAllAsRead(userId) {
    const result = await Notification.markAllAsRead(userId);
    logger.info(`Marked all notifications as read for user ${userId}`);
    return result;
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for verification)
   * @returns {Promise<boolean>}
   */
  async deleteNotification(notificationId, userId) {
    const result = await Notification.deleteOne({
      _id: notificationId,
      userId,
    });

    return result.deletedCount > 0;
  }

  /**
   * Process pending notifications
   * Called by background worker
   * @returns {Promise<Object>}
   */
  async processPendingNotifications() {
    try {
      const pendingNotifications = await Notification.getPendingNotifications();

      const results = {
        processed: 0,
        failed: 0,
      };

      for (const notification of pendingNotifications) {
        try {
          const user = await require('../models/index.js').User.findById(notification.userId);
          
          if (!user) {
            logger.warn(`User not found for notification ${notification._id}`);
            notification.status = 'failed';
            notification.lastError = 'User not found';
            await notification.save();
            results.failed++;
            continue;
          }

          await this.sendNotification(notification, user);
          results.processed++;
        } catch (error) {
          logger.error(`Failed to process notification ${notification._id}:`, error);
          results.failed++;
        }
      }

      logger.info(`Processed ${results.processed} pending notifications, ${results.failed} failed`);
      return results;
    } catch (error) {
      logger.error('Error processing pending notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   * @returns {Promise<number>} - Number of deleted notifications
   */
  async cleanupExpiredNotifications() {
    try {
      const count = await Notification.cleanupExpired();
      logger.info(`Cleaned up ${count} expired notifications`);
      return count;
    } catch (error) {
      logger.error('Error cleaning up notifications:', error);
      return 0;
    }
  }
}

// Export singleton instance
export default new NotificationService();
