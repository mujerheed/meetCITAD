import {
  WeeklyProgram,
  WeeklyActivity,
  PersonalWeeklyTask,
  Event,
  User,
} from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import {
  buildWeekMeta,
  endOfWeekForStart,
  normalizeWeekStart,
  overlapsWeek,
  toDateOnlyString,
} from '../utils/week.js';
import {
  activityIsVisible,
  getActivityForAdmin,
  getProgramById,
  getPublicActivity,
  loadPreviewSchedule,
  loadWeekSchedule,
  resolveActivity,
  serializeProgram,
  touchProgram,
} from '../services/weeklyProgram.service.js';
import {
  buildWeeklySummary,
  renderSummaryHtml,
  summaryFileName,
} from '../services/weeklySummary.service.js';
import notificationService from '../services/notification.service.js';
import {
  buildCalendar,
  calendarFileName,
} from '../services/weeklyCalendar.service.js';

const AUDIT_RESOURCE = 'weekly_program';

const audit = async (req, action, resourceId, details = {}) => {
  try {
    if (req.user && typeof req.user.logAction === 'function') {
      await req.user.logAction(
        action,
        AUDIT_RESOURCE,
        resourceId,
        details,
        req.ip
      );
    }
  } catch (error) {
    logger.warn(`Weekly program audit log failed: ${error.message}`);
  }
};

const success = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, status: 'success', data });

const weekFromQuery = (value) => {
  try {
    return normalizeWeekStart(value);
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};

const pick = (object, keys) =>
  keys.reduce((result, key) => {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      result[key] = object[key];
    }
    return result;
  }, {});

const ACTIVITY_FIELDS = [
  'title',
  'description',
  'activityType',
  'project',
  'department',
  'referenceCode',
  'startDateTime',
  'endDateTime',
  'timezone',
  'allDay',
  'venue',
  'mode',
  'meetingUrl',
  'contact',
  'internalNotes',
  'visibility',
  'status',
  'bannerImage',
  'thumbnail',
];

function cleanActivityPayload(body, { linkedEvent = false } = {}) {
  const payload = pick(body || {}, ACTIVITY_FIELDS);

  if (linkedEvent) {
    delete payload.title;
    delete payload.description;
    delete payload.startDateTime;
    delete payload.endDateTime;
    delete payload.venue;
    delete payload.allDay;
  }

  if (payload.startDateTime === null || payload.startDateTime === '') {
    delete payload.startDateTime;
  }
  if (payload.endDateTime === null || payload.endDateTime === '') {
    delete payload.endDateTime;
  }
  if (payload.meetingUrl === null || payload.meetingUrl === '') {
    delete payload.meetingUrl;
  }
  if (payload.bannerImage === null || payload.bannerImage === '') {
    delete payload.bannerImage;
  }

  return payload;
}

async function loadAdminProgram(programId) {
  const program = await WeeklyProgram.findById(programId);
  if (!program) throw new AppError('Weekly program not found', 404);
  return program;
}

const canPublishWeekly = (req) =>
  req.user?.role === 'super_admin' ||
  (typeof req.user?.hasPermission === 'function' &&
    req.user.hasPermission('publish_weekly_programs'));

async function summaryContext(program) {
  const meta = buildWeekMeta(program.weekStart);
  const rawActivities = await WeeklyActivity.find({
    weeklyProgramId: program._id,
    status: 'published',
  }).populate('eventId');

  // A summary is a shareable view of the week, so it must use exactly the
  // same overlap boundary as the schedule instead of listing an activity that
  // merely belongs to the program document.
  const inWeek = rawActivities
    .map((activity) => ({
      raw: activity,
      resolved: resolveActivity(activity, {
        includePrivate: false,
        authenticated: false,
      }),
    }))
    .filter(({ resolved }) =>
      overlapsWeek(
        resolved.startDateTime,
        resolved.endDateTime,
        meta.weekStart,
        meta.weekEnd
      )
    );

  const includedRaw = inWeek.filter(({ raw }) =>
    activityIsVisible(raw, { viewer: null })
  );

  const activities = includedRaw.map(({ resolved }) => resolved);

  const summary = buildWeeklySummary({
    program,
    activities,
    format: 'whatsapp',
  });

  const excluded = inWeek.length - includedRaw.length;
  const warnings = [];

  if (excluded > 0) {
    warnings.push(
      `${excluded} ${
        excluded === 1 ? 'activity was' : 'activities were'
      } excluded from this shareable summary because of authenticated or staff-only visibility, or an unpublished linked event.`
    );
  }

  if (program.status !== 'published') {
    warnings.push(
      'This week is not published yet. The summary contains only activities currently marked published.'
    );
  }

  return { summary, activities, warnings, excluded };
}

class WeeklyProgramController {
  async getAdminWeek(req, res, next) {
    try {
      const schedule = await loadWeekSchedule({
        weekStart: req.query.weekStart,
        adminPreview: true,
        viewer: req.user,
        userRole: req.userRole,
      });

      success(res, schedule);
    } catch (error) {
      next(error);
    }
  }

  async createProgram(req, res, next) {
    try {
      const weekStart = weekFromQuery(req.body.weekStart);
      const existing = await WeeklyProgram.findOne({ weekStart });

      if (existing) {
        throw new AppError(
          'A weekly program already exists for this week. Open it to make changes.',
          409
        );
      }

      const program = await WeeklyProgram.create({
        weekStart,
        weekEnd: endOfWeekForStart(weekStart),
        title: req.body.title || 'CITAD Weekly Programs',
        publicContactEmail: req.body.publicContactEmail,
        createdBy: req.user._id,
        updatedBy: req.user._id,
      });

      await audit(req, 'weekly_program.create', program._id, {
        weekStart: program.weekStart,
      });

      success(
        res,
        {
          program: serializeProgram(program, { includePrivate: true }),
          week: buildWeekMeta(program.weekStart),
        },
        201
      );
    } catch (error) {
      next(error);
    }
  }

  async getProgram(req, res, next) {
    try {
      const { program, serialized } = await getProgramById(req.params.id);
      success(res, {
        program: serialized,
        week: buildWeekMeta(program.weekStart),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProgram(req, res, next) {
    try {
      const program = await loadAdminProgram(req.params.id);

      if (program.status === 'archived') {
        throw new AppError('An archived weekly program cannot be changed', 400);
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'weekStart')) {
        throw new AppError(
          'Week start is immutable. Create a separate program for another week.',
          400
        );
      }

      if (req.body.title !== undefined) program.title = req.body.title;
      if (req.body.publicContactEmail !== undefined) {
        program.publicContactEmail = req.body.publicContactEmail;
      }

      program.updatedBy = req.user._id;
      program.version += 1;
      await program.save();

      await audit(req, 'weekly_program.update', program._id, {
        fields: Object.keys(pick(req.body, ['title', 'publicContactEmail'])),
      });

      success(res, {
        program: serializeProgram(program, { includePrivate: true }),
      });
    } catch (error) {
      next(error);
    }
  }

  async publishProgram(req, res, next) {
    try {
      const program = await loadAdminProgram(req.params.id);
      if (program.status === 'archived') {
        throw new AppError('An archived program cannot be published', 400);
      }

      const publishedAt = new Date();
      const result = await WeeklyActivity.updateMany(
        {
          weeklyProgramId: program._id,
          status: { $ne: 'archived' },
        },
        {
          $set: {
            status: 'published',
            publishedAt,
            publishedBy: req.user._id,
            updatedBy: req.user._id,
          },
        }
      );

      program.status = 'published';
      program.publishedAt = program.publishedAt || publishedAt;
      program.publishedBy = req.user._id;
      program.publishedVersion = program.version;
      program.updatedBy = req.user._id;
      await program.save();

      await audit(req, 'weekly_program.publish', program._id, {
        version: program.version,
        activityCount: result.modifiedCount,
      });

      success(res, {
        program: serializeProgram(program, { includePrivate: true }),
        publishedActivities: result.modifiedCount,
      });
    } catch (error) {
      next(error);
    }
  }

  async unpublishProgram(req, res, next) {
    try {
      const program = await loadAdminProgram(req.params.id);
      if (program.status === 'archived') {
        throw new AppError('An archived program cannot be unpublished', 400);
      }

      program.status = 'draft';
      program.unpublishedAt = new Date();
      program.unpublishedBy = req.user._id;
      program.updatedBy = req.user._id;
      await program.save();

      await audit(req, 'weekly_program.unpublish', program._id);

      success(res, {
        program: serializeProgram(program, { includePrivate: true }),
      });
    } catch (error) {
      next(error);
    }
  }

  async archiveProgram(req, res, next) {
    try {
      const program = await loadAdminProgram(req.params.id);

      program.status = 'archived';
      program.archivedAt = new Date();
      program.archivedBy = req.user._id;
      program.updatedBy = req.user._id;
      await program.save();

      await audit(req, 'weekly_program.archive', program._id);

      success(res, {
        program: serializeProgram(program, { includePrivate: true }),
      });
    } catch (error) {
      next(error);
    }
  }

  async previewProgram(req, res, next) {
    try {
      const program = await loadAdminProgram(req.params.id);
      // Preview includes drafts and restricted activities, but only exposes the
      // fields that are safe to show to a participant.
      const preview = await loadPreviewSchedule(program);
      success(res, preview);
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req, res, next) {
    try {
      const program = await loadAdminProgram(req.params.id);
      const { activities, warnings, excluded } = await summaryContext(program);
      const format = req.query.format === 'email' ? 'email' : 'whatsapp';
      const rendered = buildWeeklySummary({
        program,
        activities,
        format,
      });

      success(res, {
        weekStart: program.weekStart,
        weekLabel: buildWeekMeta(program.weekStart).weekLabel,
        format,
        text: rendered.text,
        activityCount: rendered.activityCount,
        warnings,
        excludedCount: excluded,
        generatedAt: rendered.generatedAt,
      });
    } catch (error) {
      next(error);
    }
  }

  async exportSummary(req, res, next) {
    try {
      const program = await loadAdminProgram(req.params.id);
      const format = req.query.format === 'html' ? 'html' : 'txt';
      const { activities } = await summaryContext(program);

      if (format === 'html') {
        const html = renderSummaryHtml({ program, activities });
        const filename = summaryFileName(program, 'html');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`
        );
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.send(html);
      }

      const summary = buildWeeklySummary({
        program,
        activities,
        format: 'email',
      });
      const filename = summaryFileName(program, 'txt');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(summary.text);
    } catch (error) {
      next(error);
    }
  }

  async downloadProgramCalendar(req, res, next) {
    try {
      const program = await loadAdminProgram(req.params.id);
      const schedule = await loadWeekSchedule({
        weekStart: program.weekStart,
        adminPreview: true,
        viewer: req.user,
      });

      const filename = calendarFileName(program);
      const calendar = await buildCalendar(schedule.activities, { filename });
      return this.sendCalendar(res, calendar, filename);
    } catch (error) {
      next(error);
    }
  }

  async notifyProgram(req, res, next) {
    try {
      const program = await loadAdminProgram(req.params.id);

      if (program.status !== 'published') {
        throw new AppError(
          'Publish the weekly program before sending notifications',
          400
        );
      }

      const batchId = `weekly-${program._id}-${program.publishedVersion}`;

      // Claim this published version atomically. Two administrators clicking at
      // the same time must never create two batches of notifications.
      const claimed = await WeeklyProgram.findOneAndUpdate(
        {
          _id: program._id,
          status: 'published',
          publishedVersion: program.publishedVersion,
          'notification.version': { $ne: program.publishedVersion },
        },
        {
          $set: {
            'notification.version': program.publishedVersion,
            'notification.batchId': batchId,
            'notification.channels': req.body.channels || ['inApp'],
            'notification.sentBy': req.user._id,
            'notification.recipientCount': 0,
            'notification.sentAt': null,
            updatedBy: req.user._id,
          },
        },
        { new: true }
      );

      if (!claimed) {
        throw new AppError(
          'Notifications have already been sent for this published version. Republish after changes to send again.',
          409
        );
      }

      try {
        const recipients = req.body.recipients;
        let users = [];

        if (recipients === 'all_active') {
          users = await User.find({ status: 'active' }).select(
            '_id fullname email phone preferences'
          );
        } else if (recipients === 'registered') {
          const linked = await WeeklyActivity.find({
            weeklyProgramId: program._id,
            eventId: { $ne: null },
            status: 'published',
          }).select('eventId');

          const eventIds = linked.map((activity) => activity.eventId);
          if (eventIds.length === 0) {
            throw new AppError(
              'This week has no linked events with registrations',
              400
            );
          }

          users = await User.find({
            status: 'active',
            'registeredEvents.eventId': { $in: eventIds },
          }).select('_id fullname email phone preferences');
        }

        if (users.length === 0) {
          throw new AppError(
            'No recipients matched the selected audience',
            400
          );
        }

        const selectedChannels = req.body.channels || ['inApp'];
        const meta = buildWeekMeta(program.weekStart);
        const results = await notificationService.sendBulkNotifications(users, {
          title: 'CITAD Weekly Programs',
          message: `The weekly programme for ${meta.weekLabel} is now available on meetCITAD. Open the weekly schedule to view venues, times and linked event details.`,
          type: 'announcement',
          category: 'info',
          priority: 'normal',
          actionUrl: `/weekly?weekStart=${toDateOnlyString(program.weekStart)}`,
          actionLabel: 'View weekly programme',
          channels: {
            inApp: { enabled: true },
            email: { enabled: selectedChannels.includes('email') },
            sms: { enabled: false },
            push: { enabled: false },
          },
          metadata: {
            customData: {
              weeklyProgramId: program._id,
              weekStart: toDateOnlyString(program.weekStart),
              version: program.publishedVersion,
            },
          },
          sentBy: req.user._id,
        });

        const sent = results.filter((result) => result.success).length;
        const failed = results.length - sent;

        await WeeklyProgram.updateOne(
          { _id: program._id, 'notification.batchId': batchId },
          {
            $set: {
              'notification.sentAt': new Date(),
              'notification.recipientCount': sent,
              'notification.channels': selectedChannels,
              updatedBy: req.user._id,
            },
          }
        );

        await audit(req, 'weekly_program.notify', program._id, {
          recipients,
          selectedChannels,
          recipientCount: users.length,
          sent,
          failed,
        });

        success(res, {
          requested: users.length,
          sent,
          failed,
          channels: selectedChannels,
          batchId,
        });
      } catch (error) {
        // A failed attempt must not consume the notification slot for this
        // published version, otherwise a corrected retry would be blocked.
        await WeeklyProgram.updateOne(
          { _id: program._id, 'notification.batchId': batchId },
          {
            $set: {
              'notification.recipientCount': 0,
              'notification.sentAt': null,
            },
            $unset: {
              'notification.version': 1,
              'notification.batchId': 1,
            },
          }
        ).catch(() => {});
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  async createActivity(req, res, next) {
    try {
      const program = await loadAdminProgram(req.params.id);
      if (program.status === 'archived') {
        throw new AppError('An archived weekly program cannot be changed', 400);
      }
      const source = req.body.source || 'standalone';
      let payload;

      if (source === 'event') {
        const event = await Event.findById(req.body.eventId);
        if (!event) throw new AppError('Linked event not found', 404);

        const duplicate = await WeeklyActivity.findOne({
          weeklyProgramId: program._id,
          eventId: event._id,
        });
        if (duplicate) {
          throw new AppError(
            'This event is already linked to the selected week',
            409
          );
        }

        payload = {
          weeklyProgramId: program._id,
          source: 'event',
          eventId: event._id,
          activityType: 'event',
          ...cleanActivityPayload(req.body, { linkedEvent: true }),
          createdBy: req.user._id,
          updatedBy: req.user._id,
        };
      } else {
        const start = new Date(req.body.startDateTime);
        const end = new Date(req.body.endDateTime);
        if (end <= start) {
          throw new AppError('End date/time must be after start date/time', 400);
        }

        payload = {
          weeklyProgramId: program._id,
          source: 'standalone',
          ...cleanActivityPayload(req.body),
          createdBy: req.user._id,
          updatedBy: req.user._id,
        };
      }

      if (payload.status === 'archived') {
        throw new AppError(
          'Create the activity as a draft or published item, then archive it explicitly',
          400
        );
      }
      if (payload.status === 'published' && !canPublishWeekly(req)) {
        throw new AppError(
          'You do not have permission to publish weekly activities',
          403
        );
      }

      const activity = await WeeklyActivity.create(payload);
      await touchProgram(program._id, req.user._id);
      const hydrated = await WeeklyActivity.findById(activity._id).populate(
        'eventId'
      );

      await audit(req, 'weekly_activity.create', activity._id, {
        weeklyProgramId: program._id,
        source: activity.source,
      });

      success(
        res,
        {
          activity: resolveActivity(hydrated, { includePrivate: true }),
        },
        201
      );
    } catch (error) {
      if (error.code === 11000) {
        return next(
          new AppError(
            'This event is already linked to the selected week',
            409
          )
        );
      }
      next(error);
    }
  }

  async addEventToWeek(req, res, next) {
    try {
      req.body.source = 'event';
      return this.createActivity(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  async listActivities(req, res, next) {
    try {
      const program = await loadAdminProgram(req.params.id);
      const query = { weeklyProgramId: program._id };
      if (req.query.status) query.status = req.query.status;
      if (req.query.activityType) query.activityType = req.query.activityType;
      if (req.query.department) {
        query.department = new RegExp(req.query.department, 'i');
      }

      let activities = await WeeklyActivity.find(query)
        .populate('eventId')
        .sort({ startDateTime: 1, title: 1 });

      if (req.query.search) {
        const search = String(req.query.search).toLowerCase();
        activities = activities.filter((activity) => {
          const resolved = resolveActivity(activity, { includePrivate: true });
          return [resolved.title, resolved.project, resolved.department]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        });
      }

      success(res, {
        activities: activities.map((activity) =>
          resolveActivity(activity, { includePrivate: true })
        ),
      });
    } catch (error) {
      next(error);
    }
  }

  async getActivity(req, res, next) {
    try {
      const { resolved } = await getActivityForAdmin(
        req.params.id,
        req.params.activityId
      );
      success(res, { activity: resolved });
    } catch (error) {
      next(error);
    }
  }

  async updateActivity(req, res, next) {
    try {
      const { activity } = await getActivityForAdmin(
        req.params.id,
        req.params.activityId
      );

      const parentProgram = await loadAdminProgram(req.params.id);
      if (parentProgram.status === 'archived') {
        throw new AppError('An archived weekly program cannot be changed', 400);
      }

      if (activity.status === 'archived') {
        throw new AppError('An archived activity cannot be edited', 400);
      }

      const payload = cleanActivityPayload(req.body, {
        linkedEvent: activity.source === 'event',
      });

      const statusChanged =
        payload.status !== undefined && payload.status !== activity.status;
      if (statusChanged && payload.status === 'archived') {
        throw new AppError(
          'Use the archive action to archive this activity',
          400
        );
      }
      if (statusChanged && !canPublishWeekly(req)) {
        throw new AppError(
          'You do not have permission to change the publication status',
          403
        );
      }

      if (activity.source !== 'event') {
        const start = payload.startDateTime
          ? new Date(payload.startDateTime)
          : activity.startDateTime;
        const end = payload.endDateTime
          ? new Date(payload.endDateTime)
          : activity.endDateTime;
        if (!start || !end || end <= start) {
          throw new AppError(
            'End date/time must be after start date/time',
            400
          );
        }
        if (payload.venue && !payload.venue.name && !activity.venue?.name) {
          throw new AppError('Venue name is required', 400);
        }
      }

      Object.assign(activity, payload);
      activity.updatedBy = req.user._id;

      if (payload.status === 'published' && !activity.publishedAt) {
        activity.publishedAt = new Date();
        activity.publishedBy = req.user._id;
      }

      await activity.save();
      await touchProgram(activity.weeklyProgramId, req.user._id);

      const hydrated = await WeeklyActivity.findById(activity._id).populate(
        'eventId'
      );

      await audit(req, 'weekly_activity.update', activity._id, {
        weeklyProgramId: activity.weeklyProgramId,
        fields: Object.keys(payload),
      });

      success(res, {
        activity: resolveActivity(hydrated, { includePrivate: true }),
      });
    } catch (error) {
      next(error);
    }
  }

  async archiveActivity(req, res, next) {
    try {
      const parentProgram = await loadAdminProgram(req.params.id);
      if (parentProgram.status === 'archived') {
        throw new AppError('An archived weekly program cannot be changed', 400);
      }

      const { activity } = await getActivityForAdmin(
        req.params.id,
        req.params.activityId
      );

      if (activity.status === 'archived') {
        throw new AppError('This activity is already archived', 400);
      }

      activity.status = 'archived';
      activity.archivedAt = new Date();
      activity.updatedBy = req.user._id;
      await activity.save();
      await touchProgram(activity.weeklyProgramId, req.user._id);

      await audit(req, 'weekly_activity.archive', activity._id, {
        weeklyProgramId: activity.weeklyProgramId,
      });

      success(res, {
        activity: resolveActivity(activity, { includePrivate: true }),
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadBanner(req, res, next) {
    try {
      const parentProgram = await loadAdminProgram(req.params.id);
      if (parentProgram.status === 'archived') {
        throw new AppError('An archived weekly program cannot be changed', 400);
      }

      const { activity } = await getActivityForAdmin(
        req.params.id,
        req.params.activityId
      );

      if (activity.status === 'archived') {
        throw new AppError('An archived activity cannot be edited', 400);
      }

      if (!req.body.bannerImage) {
        throw new AppError('No banner image was uploaded', 400);
      }

      activity.bannerImage = req.body.bannerImage;
      activity.thumbnail = req.body.thumbnail || '';
      activity.updatedBy = req.user._id;
      await activity.save();
      await touchProgram(activity.weeklyProgramId, req.user._id);

      const hydrated = await WeeklyActivity.findById(activity._id).populate(
        'eventId'
      );

      success(res, {
        activity: resolveActivity(hydrated, { includePrivate: true }),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPublicWeek(req, res, next) {
    try {
      const schedule = await loadWeekSchedule({
        weekStart: req.query.weekStart,
        adminPreview: false,
        viewer: req.user || null,
        userRole: req.userRole || null,
      });

      success(res, schedule);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentWeek(req, res, next) {
    try {
      const schedule = await loadWeekSchedule({
        weekStart: undefined,
        adminPreview: false,
        viewer: req.user || null,
        userRole: req.userRole || null,
      });

      success(res, schedule);
    } catch (error) {
      next(error);
    }
  }

  async getPublicActivityDetail(req, res, next) {
    try {
      const { resolved, activity, program } = await getPublicActivity(
        req.params.activityId,
        { viewer: req.user || null }
      );

      const task = req.user
        ? await PersonalWeeklyTask.findOne({
            userId: req.user._id,
            weeklyActivityId: activity._id,
          })
        : null;

      success(res, {
        activity: resolved,
        week: buildWeekMeta(program.weekStart),
        personalTask: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadActivityCalendar(req, res, next) {
    try {
      const { resolved } = await getPublicActivity(req.params.activityId, {
        viewer: req.user || null,
      });
      const filename = calendarFileName(null, resolved);
      const calendar = await buildCalendar([resolved], { filename });

      return this.sendCalendar(res, calendar, filename);
    } catch (error) {
      next(error);
    }
  }

  async downloadPublicWeekCalendar(req, res, next) {
    try {
      const schedule = await loadWeekSchedule({
        weekStart: req.query.weekStart,
        adminPreview: false,
        viewer: req.user || null,
      });

      if (!schedule.program) {
        throw new AppError('Weekly program not found', 404);
      }

      const filename = calendarFileName(schedule.program);
      const calendar = await buildCalendar(schedule.activities, { filename });
      return this.sendCalendar(res, calendar, filename);
    } catch (error) {
      next(error);
    }
  }

  sendCalendar(res, calendar, filename) {
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (!calendar || !calendar.value) {
      return res.send(
        'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//meetCITAD//Weekly Programs//EN\r\nCALSCALE:GREGORIAN\r\nEND:VCALENDAR\r\n'
      );
    }

    return res.send(calendar.value);
  }
}

export default new WeeklyProgramController();
