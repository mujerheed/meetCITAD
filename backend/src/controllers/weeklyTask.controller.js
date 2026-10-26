import { PersonalWeeklyTask } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { normalizeWeekStart, buildWeekMeta } from '../utils/week.js';
import {
  activityIsVisible,
  getPublicActivity,
  resolveActivity,
} from '../services/weeklyProgram.service.js';

const ACTIVITY_POPULATE = {
  path: 'weeklyActivityId',
  populate: [{ path: 'eventId' }, { path: 'weeklyProgramId' }],
};

/**
 * A personal task may outlive an activity's public visibility: the activity can
 * be restricted, its week archived, or its linked event unpublished. The user's
 * own task always remains, but the activity summary is only attached while the
 * viewer could also open that activity in the public schedule.
 */
const visibleTaskActivity = (activity, viewer) => {
  if (!activity || !activity._id) return null;
  if (!viewer) return null;
  if (activity.weeklyProgramId?.status !== 'published') return null;
  if (!activityIsVisible(activity, { viewer })) return null;
  return resolveActivity(activity, {
    includePrivate: false,
    authenticated: true,
  });
};

const serialiseTask = (task, viewer = null) => {
  const value = typeof task.toObject === 'function' ? task.toObject() : task;
  const resolvedActivity = visibleTaskActivity(value.weeklyActivityId, viewer);

  return {
    id: value._id,
    _id: value._id,
    title: value.title,
    note: value.note || '',
    weekStart: value.weekStart,
    dueDate: value.dueDate,
    completed: value.completed,
    completedAt: value.completedAt,
    source: value.source,
    weeklyActivityId:
      value.weeklyActivityId?._id || value.weeklyActivityId || null,
    activity: resolvedActivity
      ? {
          id: resolvedActivity.id,
          title: resolvedActivity.title,
          startDateTime: resolvedActivity.startDateTime,
          endDateTime: resolvedActivity.endDateTime,
          venue: resolvedActivity.venue,
          activityType: resolvedActivity.activityType,
          status: resolvedActivity.status,
        }
      : null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

class WeeklyTaskController {
  async listTasks(req, res, next) {
    try {
      let weekStart;
      try {
        weekStart = normalizeWeekStart(req.query.weekStart);
      } catch (error) {
        throw new AppError(error.message, 400);
      }

      const tasks = await PersonalWeeklyTask.find({
        userId: req.user._id,
        weekStart,
      })
        .populate(ACTIVITY_POPULATE)
        .sort({ completed: 1, dueDate: 1, createdAt: 1 });

      res.status(200).json({
        success: true,
        status: 'success',
        data: {
          ...buildWeekMeta(weekStart),
          tasks: tasks.map((task) => serialiseTask(task, req.user)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async createTask(req, res, next) {
    try {
      let weekStart;
      let title;
      let source = 'custom';

      if (req.body.weeklyActivityId) {
        const { resolved, program } = await getPublicActivity(
          req.body.weeklyActivityId,
          { viewer: req.user }
        );

        weekStart = program.weekStart;
        title = req.body.title || resolved.title;
        source = 'activity';
      } else {
        try {
          weekStart = normalizeWeekStart(req.body.weekStart);
        } catch (error) {
          throw new AppError(error.message, 400);
        }
        title = req.body.title;
      }

      if (!title || !String(title).trim()) {
        throw new AppError('Task title is required', 400);
      }

      const existing = req.body.weeklyActivityId
        ? await PersonalWeeklyTask.findOne({
            userId: req.user._id,
            weeklyActivityId: req.body.weeklyActivityId,
          })
        : null;

      if (existing) {
        throw new AppError('This activity is already in your weekly tasks', 409);
      }

      const task = await PersonalWeeklyTask.create({
        userId: req.user._id,
        weeklyActivityId: req.body.weeklyActivityId || null,
        title: String(title).trim(),
        note: req.body.note,
        weekStart,
        dueDate: req.body.dueDate || null,
        source,
      });

      const hydrated = await PersonalWeeklyTask.findById(task._id).populate(
        ACTIVITY_POPULATE
      );

      res.status(201).json({
        success: true,
        status: 'success',
        data: { task: serialiseTask(hydrated, req.user) },
      });
    } catch (error) {
      if (error.code === 11000) {
        return next(
          new AppError('This activity is already in your weekly tasks', 409)
        );
      }
      next(error);
    }
  }

  async updateTask(req, res, next) {
    try {
      const task = await PersonalWeeklyTask.findOne({
        _id: req.params.taskId,
        userId: req.user._id,
      });

      if (!task) throw new AppError('Weekly task not found', 404);

      if (req.body.title !== undefined) task.title = req.body.title;
      if (req.body.note !== undefined) task.note = req.body.note;
      if (req.body.completed !== undefined) {
        task.completed = req.body.completed;
      }
      if (req.body.dueDate !== undefined) {
        task.dueDate = req.body.dueDate || null;
      }

      await task.save();

      const hydrated = await PersonalWeeklyTask.findById(task._id).populate(
        ACTIVITY_POPULATE
      );

      res.status(200).json({
        success: true,
        status: 'success',
        data: { task: serialiseTask(hydrated, req.user) },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req, res, next) {
    try {
      const task = await PersonalWeeklyTask.findOneAndDelete({
        _id: req.params.taskId,
        userId: req.user._id,
      });

      if (!task) throw new AppError('Weekly task not found', 404);

      res.status(200).json({
        success: true,
        status: 'success',
        data: { id: task._id },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new WeeklyTaskController();
