import express from 'express';
import { weeklyProgramController } from '../controllers/index.js';
import {
  protect,
  restrictTo,
  adminLimiter,
  exportLimiter,
  uploadLimiter,
  checkPermission,
  validateAdminWeekQuery,
  validateWeeklyProgramId,
  validateCreateWeeklyProgram,
  validateUpdateWeeklyProgram,
  validateWeeklyActivityId,
  validateCreateWeeklyActivity,
  validateUpdateWeeklyActivity,
  validateFromEvent,
  validateSummaryQuery,
  validateExportQuery,
  validateNotifyWeeklyProgram,
  uploadWeeklyBanner,
  processWeeklyBanner,
  handleMulterError,
  noStoreWeeklyData,
} from '../middleware/index.js';

const router = express.Router();

// Every endpoint in this router is an authenticated administrator endpoint.
router.use(protect, restrictTo('admin'), adminLimiter, noStoreWeeklyData);

// Read-only access is available to every administrator, including auditors.
router.get(
  '/',
  validateAdminWeekQuery,
  weeklyProgramController.getAdminWeek.bind(weeklyProgramController)
);

router.post(
  '/',
  checkPermission('manage_weekly_programs'),
  validateCreateWeeklyProgram,
  weeklyProgramController.createProgram.bind(weeklyProgramController)
);

router.get(
  '/:id',
  validateWeeklyProgramId,
  weeklyProgramController.getProgram.bind(weeklyProgramController)
);

router.patch(
  '/:id',
  checkPermission('manage_weekly_programs'),
  validateUpdateWeeklyProgram,
  weeklyProgramController.updateProgram.bind(weeklyProgramController)
);

router.delete(
  '/:id',
  checkPermission('publish_weekly_programs'),
  validateWeeklyProgramId,
  weeklyProgramController.archiveProgram.bind(weeklyProgramController)
);

router.get(
  '/:id/preview',
  validateWeeklyProgramId,
  weeklyProgramController.previewProgram.bind(weeklyProgramController)
);

router.get(
  '/:id/summary',
  validateWeeklyProgramId,
  validateSummaryQuery,
  weeklyProgramController.getSummary.bind(weeklyProgramController)
);

router.get(
  '/:id/export',
  exportLimiter,
  validateWeeklyProgramId,
  validateExportQuery,
  weeklyProgramController.exportSummary.bind(weeklyProgramController)
);

router.get(
  '/:id/calendar.ics',
  validateWeeklyProgramId,
  weeklyProgramController.downloadProgramCalendar.bind(
    weeklyProgramController
  )
);

router.post(
  '/:id/publish',
  checkPermission('publish_weekly_programs'),
  validateWeeklyProgramId,
  weeklyProgramController.publishProgram.bind(weeklyProgramController)
);

router.post(
  '/:id/unpublish',
  checkPermission('publish_weekly_programs'),
  validateWeeklyProgramId,
  weeklyProgramController.unpublishProgram.bind(weeklyProgramController)
);

router.post(
  '/:id/notify',
  checkPermission('publish_weekly_programs', 'send_notifications'),
  validateWeeklyProgramId,
  validateNotifyWeeklyProgram,
  weeklyProgramController.notifyProgram.bind(weeklyProgramController)
);

// Activities within a week
router.get(
  '/:id/activities',
  validateWeeklyProgramId,
  weeklyProgramController.listActivities.bind(weeklyProgramController)
);

router.post(
  '/:id/activities/from-event',
  checkPermission('manage_weekly_programs'),
  validateWeeklyProgramId,
  validateFromEvent,
  weeklyProgramController.addEventToWeek.bind(weeklyProgramController)
);

router.post(
  '/:id/activities',
  checkPermission('manage_weekly_programs'),
  validateWeeklyProgramId,
  validateCreateWeeklyActivity,
  weeklyProgramController.createActivity.bind(weeklyProgramController)
);

router.get(
  '/:id/activities/:activityId',
  validateWeeklyProgramId,
  validateWeeklyActivityId,
  weeklyProgramController.getActivity.bind(weeklyProgramController)
);

router.patch(
  '/:id/activities/:activityId',
  checkPermission('manage_weekly_programs'),
  validateWeeklyProgramId,
  validateWeeklyActivityId,
  validateUpdateWeeklyActivity,
  weeklyProgramController.updateActivity.bind(weeklyProgramController)
);

router.delete(
  '/:id/activities/:activityId',
  checkPermission('manage_weekly_programs'),
  validateWeeklyProgramId,
  validateWeeklyActivityId,
  weeklyProgramController.archiveActivity.bind(weeklyProgramController)
);

router.post(
  '/:id/activities/:activityId/banner',
  checkPermission('manage_weekly_programs'),
  uploadLimiter,
  validateWeeklyProgramId,
  validateWeeklyActivityId,
  uploadWeeklyBanner,
  processWeeklyBanner,
  handleMulterError,
  weeklyProgramController.uploadBanner.bind(weeklyProgramController)
);

export default router;
