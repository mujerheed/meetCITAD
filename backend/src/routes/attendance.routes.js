import express from 'express';
import { attendanceController } from '../controllers/index.js';
import { protect, restrictTo } from '../middleware/index.js';
import { validateQRScan } from '../middleware/validation.js';

const router = express.Router();

router.post('/scan', protect, validateQRScan, attendanceController.scanQRCode.bind(attendanceController));
router.post('/manual-checkin', protect, restrictTo('admin'), attendanceController.manualCheckIn.bind(attendanceController));
router.post('/bulk-checkin', protect, restrictTo('admin'), attendanceController.bulkCheckIn.bind(attendanceController));
router.post('/undo-checkin', protect, restrictTo('admin'), attendanceController.undoCheckIn.bind(attendanceController));

router.get('/report/:eventId', protect, restrictTo('admin'), attendanceController.getAttendanceReport.bind(attendanceController));
router.get('/search', protect, restrictTo('admin'), attendanceController.searchAttendee.bind(attendanceController));
router.get('/live/:eventId', protect, restrictTo('admin'), attendanceController.getLiveStats.bind(attendanceController));

export default router;
