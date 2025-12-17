import express from 'express';
import { userController } from '../controllers/index.js';
import { protect } from '../middleware/index.js';
import { validateUpdateProfile } from '../middleware/validation.js';
import { uploadProfilePicture, processProfilePicture, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

router.get('/profile', protect, userController.getProfile.bind(userController));
router.put('/profile', protect, validateUpdateProfile, userController.updateProfile.bind(userController));
router.post('/profile/picture', protect, uploadProfilePicture, processProfilePicture, handleMulterError, userController.uploadProfilePicture.bind(userController));
router.delete('/profile/picture', protect, userController.deleteProfilePicture.bind(userController));
router.put('/preferences', protect, userController.updatePreferences.bind(userController));

// Event registration
router.post('/events/:eventId/register', protect, userController.registerForEvent.bind(userController));
router.delete('/events/:eventId/register', protect, userController.unregisterFromEvent.bind(userController));
router.get('/events/registered', protect, userController.getRegisteredEvents.bind(userController));
router.get('/events/:eventId/status', protect, userController.getEventStatus.bind(userController));

router.get('/certificates', protect, userController.getCertificates.bind(userController));
router.get('/statistics', protect, userController.getUserStatistics.bind(userController));
router.delete('/account', protect, userController.deleteAccount.bind(userController));

export default router;
