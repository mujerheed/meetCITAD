import express from 'express';
import { notificationController } from '../controllers/index.js';
import { protect, restrictTo } from '../middleware/index.js';
import { validateSendNotification } from '../middleware/validation.js';

const router = express.Router();

router.get('/', protect, notificationController.getUserNotifications.bind(notificationController));
router.get('/unread/count', protect, notificationController.getUnreadCount.bind(notificationController));
router.get('/:id', protect, notificationController.getNotification.bind(notificationController));
router.post('/:id/mark-read', protect, notificationController.markAsRead.bind(notificationController));
router.post('/mark-all', protect, notificationController.markAllAsRead.bind(notificationController));
router.delete('/:id', protect, notificationController.deleteNotification.bind(notificationController));
router.delete('/', protect, notificationController.deleteAllNotifications.bind(notificationController));

// Admin notification actions
router.post('/broadcast', protect, restrictTo('admin'), validateSendNotification, notificationController.sendBroadcast.bind(notificationController));
router.post('/event', protect, restrictTo('admin'), notificationController.sendEventNotification.bind(notificationController));
router.post('/reminder', protect, restrictTo('admin'), notificationController.sendEventReminder.bind(notificationController));

router.get('/preferences', protect, notificationController.getPreferences.bind(notificationController));
router.put('/preferences', protect, notificationController.updatePreferences.bind(notificationController));

export default router;
