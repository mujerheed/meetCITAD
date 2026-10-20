import express from 'express';
import { attendanceController } from '../controllers/index.js';
import {
  protect,
  restrictTo,
  checkPermission,
  scanLimiter,
} from '../middleware/index.js';
import { validateQRScan } from '../middleware/validation.js';

const router = express.Router();

// Attendance scanning is an administrator-only operation. Participants never
// receive permission to mark attendance directly.
router.use(protect, restrictTo('admin'), checkPermission('view_reports'));

router.post(
  '/scan',
  scanLimiter,
  validateQRScan,
  attendanceController.scanQRCode.bind(attendanceController)
);
router.post('/manual-checkin', attendanceController.manualCheckIn.bind(attendanceController));
router.post('/bulk-checkin', attendanceController.bulkCheckIn.bind(attendanceController));
router.post('/undo-checkin', attendanceController.undoCheckIn.bind(attendanceController));

router.get('/report/:eventId', attendanceController.getAttendanceReport.bind(attendanceController));
router.get('/search', attendanceController.searchAttendee.bind(attendanceController));
router.get('/live/:eventId', attendanceController.getLiveStats.bind(attendanceController));

export default router;
