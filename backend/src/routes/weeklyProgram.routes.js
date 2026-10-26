import express from 'express';
import {
  weeklyProgramController,
  weeklyTaskController,
} from '../controllers/index.js';
import {
  protect,
  optionalAuth,
  weeklyTaskLimiter,
  validateWeekStartQuery,
  validateWeeklyActivityId,
  validateCreateTask,
  validateUpdateTask,
  validateTaskId,
  noStoreWeeklyData,
} from '../middleware/index.js';

const router = express.Router();

router.use(noStoreWeeklyData);

// Personal weekly tasks are private and must come before the flexible public
// activity route. They never feed shared caches or public responses.
router.get(
  '/tasks',
  protect,
  validateWeekStartQuery,
  weeklyTaskController.listTasks.bind(weeklyTaskController)
);

router.post(
  '/tasks',
  protect,
  weeklyTaskLimiter,
  validateCreateTask,
  weeklyTaskController.createTask.bind(weeklyTaskController)
);

router.patch(
  '/tasks/:taskId',
  protect,
  weeklyTaskLimiter,
  validateUpdateTask,
  weeklyTaskController.updateTask.bind(weeklyTaskController)
);

router.delete(
  '/tasks/:taskId',
  protect,
  weeklyTaskLimiter,
  validateTaskId,
  weeklyTaskController.deleteTask.bind(weeklyTaskController)
);

// Calendar downloads
router.get(
  '/calendar.ics',
  optionalAuth,
  validateWeekStartQuery,
  weeklyProgramController.downloadPublicWeekCalendar.bind(
    weeklyProgramController
  )
);

router.get(
  '/activities/:activityId/calendar.ics',
  optionalAuth,
  validateWeeklyActivityId,
  weeklyProgramController.downloadActivityCalendar.bind(
    weeklyProgramController
  )
);

router.get(
  '/activities/:activityId',
  optionalAuth,
  validateWeeklyActivityId,
  weeklyProgramController.getPublicActivityDetail.bind(
    weeklyProgramController
  )
);

router.get(
  '/current',
  optionalAuth,
  weeklyProgramController.getCurrentWeek.bind(weeklyProgramController)
);

router.get(
  '/',
  optionalAuth,
  validateWeekStartQuery,
  weeklyProgramController.getPublicWeek.bind(weeklyProgramController)
);

export default router;
