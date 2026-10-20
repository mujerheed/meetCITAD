import express from 'express';
import { feedbackController } from '../controllers/index.js';
import {
  protect,
  restrictTo,
  checkPermission,
  feedbackLimiter,
} from '../middleware/index.js';
import { validateSubmitFeedback } from '../middleware/validation.js';

const router = express.Router();

// Submission (any authenticated user)
router.post(
  '/',
  protect,
  feedbackLimiter,
  validateSubmitFeedback,
  feedbackController.submitFeedback.bind(feedbackController)
);

// Admin list & analytics (static paths before /:id)
router.get(
  '/',
  protect,
  restrictTo('admin'),
  checkPermission('view_reports'),
  feedbackController.getAllFeedback.bind(feedbackController)
);
router.get(
  '/event/:eventId',
  protect,
  restrictTo('admin'),
  checkPermission('view_reports'),
  feedbackController.getEventFeedback.bind(feedbackController)
);
router.get(
  '/user/:userId',
  protect,
  restrictTo('admin'),
  checkPermission('view_reports'),
  feedbackController.getUserFeedback.bind(feedbackController)
);
router.get(
  '/analytics/:eventId',
  protect,
  restrictTo('admin'),
  checkPermission('view_reports'),
  feedbackController.getFeedbackAnalytics.bind(feedbackController)
);
router.get(
  '/export/:eventId',
  protect,
  restrictTo('admin'),
  checkPermission('view_reports'),
  feedbackController.exportFeedback.bind(feedbackController)
);

// Single feedback
router.get('/:id', protect, feedbackController.getFeedback.bind(feedbackController));
router.put('/:id', protect, feedbackController.updateFeedback.bind(feedbackController));
router.delete(
  '/:id',
  protect,
  restrictTo('admin'),
  checkPermission('view_reports'),
  feedbackController.deleteFeedback.bind(feedbackController)
);

// Admin actions
router.post(
  '/:id/respond',
  protect,
  restrictTo('admin'),
  checkPermission('view_reports'),
  feedbackController.respondToFeedback.bind(feedbackController)
);
router.post(
  '/:id/flag',
  protect,
  restrictTo('admin'),
  checkPermission('view_reports'),
  feedbackController.flagFeedback.bind(feedbackController)
);

export default router;
