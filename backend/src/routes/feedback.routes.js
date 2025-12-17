import express from 'express';
import { feedbackController } from '../controllers/index.js';
import { protect, restrictTo } from '../middleware/index.js';
import { validateSubmitFeedback } from '../middleware/validation.js';

const router = express.Router();

router.post('/', protect, validateSubmitFeedback, feedbackController.submitFeedback.bind(feedbackController));
router.get('/event/:eventId', protect, restrictTo('admin'), feedbackController.getEventFeedback.bind(feedbackController));
router.get('/:id', protect, feedbackController.getFeedback.bind(feedbackController));
router.get('/user/:userId', protect, restrictTo('admin'), feedbackController.getUserFeedback.bind(feedbackController));
router.put('/:id', protect, feedbackController.updateFeedback.bind(feedbackController));
router.delete('/:id', protect, restrictTo('admin'), feedbackController.deleteFeedback.bind(feedbackController));
router.post('/:id/respond', protect, restrictTo('admin'), feedbackController.respondToFeedback.bind(feedbackController));
router.get('/analytics', protect, restrictTo('admin'), feedbackController.getFeedbackAnalytics.bind(feedbackController));
router.get('/export', protect, restrictTo('admin'), feedbackController.exportFeedback.bind(feedbackController));

export default router;
