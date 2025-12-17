import express from 'express';
import {
  eventController,
} from '../controllers/index.js';
import {
  protect,
  restrictTo,
  optionalAuth,
} from '../middleware/index.js';
import {
  validateCreateEvent,
  validateUpdateEvent,
  validateEventId,
} from '../middleware/validation.js';
import {
  uploadEventBanner,
  processEventBanner,
  uploadEventGallery,
  processEventGallery,
  handleMulterError,
} from '../middleware/upload.js';

const router = express.Router();

// Public list and view (optional auth attaches user if present)
router.get('/', optionalAuth, eventController.getAllEvents.bind(eventController));
router.get('/:id', optionalAuth, validateEventId, eventController.getEvent.bind(eventController));

// Admin actions
router.post('/', protect, restrictTo('admin'), validateCreateEvent, eventController.createEvent.bind(eventController));
router.put('/:id', protect, restrictTo('admin'), validateEventId, validateUpdateEvent, eventController.updateEvent.bind(eventController));
router.delete('/:id', protect, restrictTo('admin'), validateEventId, eventController.deleteEvent.bind(eventController));

// File uploads
router.post('/:id/banner', protect, restrictTo('admin'), validateEventId, uploadEventBanner, processEventBanner, handleMulterError, eventController.uploadBanner.bind(eventController));
router.post('/:id/gallery', protect, restrictTo('admin'), validateEventId, uploadEventGallery, processEventGallery, handleMulterError, eventController.uploadGalleryImages.bind(eventController));
router.delete('/:id/gallery/:imageIndex', protect, restrictTo('admin'), validateEventId, eventController.deleteGalleryImage.bind(eventController));

// QR, stats, attendees
router.get('/:id/qr', optionalAuth, validateEventId, eventController.generateEventQR.bind(eventController));
router.get('/:id/statistics', protect, restrictTo('admin'), validateEventId, eventController.getEventStatistics.bind(eventController));
router.get('/:id/attendees', protect, restrictTo('admin'), validateEventId, eventController.getEventAttendees.bind(eventController));

// Publish / cancel
router.post('/:id/publish', protect, restrictTo('admin'), validateEventId, eventController.publishEvent.bind(eventController));
router.post('/:id/cancel', protect, restrictTo('admin'), validateEventId, eventController.cancelEvent.bind(eventController));

export default router;
