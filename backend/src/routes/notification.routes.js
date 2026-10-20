import express from 'express';
import { notificationController } from '../controllers/index.js';
import {
  protect,
  restrictTo,
  checkPermission,
  communicationLimiter,
} from '../middleware/index.js';
import { validateSendNotification } from '../middleware/validation.js';

const router = express.Router();

const adminOnly = [protect, restrictTo('admin'), checkPermission('send_notifications')];

// Admin actions (static paths first)
router.post(
  '/broadcast',
  ...adminOnly,
  communicationLimiter,
  validateSendNotification,
  notificationController.sendBroadcast.bind(notificationController)
);
router.post(
  '/event/:eventId',
  ...adminOnly,
  communicationLimiter,
  notificationController.sendEventNotification.bind(notificationController)
);
router.post(
  '/reminder/:eventId',
  ...adminOnly,
  communicationLimiter,
  notificationController.sendEventReminder.bind(notificationController)
);
router.get('/statistics', ...adminOnly, notificationController.getNotificationStatistics.bind(notificationController));
router.post('/test', ...adminOnly, communicationLimiter, notificationController.testNotification.bind(notificationController));
router.post('/cleanup', ...adminOnly, notificationController.cleanupExpired.bind(notificationController));

// Preferences must be declared before /:id
router.get('/preferences', protect, notificationController.getPreferences.bind(notificationController));
router.put('/preferences', protect, notificationController.updatePreferences.bind(notificationController));

// User actions
router.get('/', protect, notificationController.getUserNotifications.bind(notificationController));
router.get('/unread/count', protect, notificationController.getUnreadCount.bind(notificationController));
router.post('/mark-all', protect, notificationController.markAllAsRead.bind(notificationController));
router.delete('/', protect, notificationController.deleteAllNotifications.bind(notificationController));

router.get('/:id', protect, notificationController.getNotification.bind(notificationController));
router.post('/:id/mark-read', protect, notificationController.markAsRead.bind(notificationController));
router.delete('/:id', protect, notificationController.deleteNotification.bind(notificationController));

export default router;
