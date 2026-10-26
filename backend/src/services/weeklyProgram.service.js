import {
  WeeklyProgram,
  WeeklyActivity,
} from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  buildWeekMeta,
  isMultiDay,
  normalizeWeekStart,
  overlapsWeek,
  toDateOnlyString,
} from '../utils/week.js';

const PUBLIC_EVENT_STATUSES = ['published', 'ongoing', 'completed'];

const toPlain = (doc) => {
  if (!doc) return null;
  return typeof doc.toObject === 'function' ? doc.toObject() : doc;
};

const eventIdOf = (activity) => {
  const event = activity?.eventId;
  if (!event) return null;
  return event._id ? event : null;
};

function serializeProgram(program, { includePrivate = false } = {}) {
  if (!program) return null;
  const value = toPlain(program);

  return {
    id: value._id,
    _id: value._id,
    weekStart: value.weekStart,
    weekEnd: value.weekEnd,
    title: value.title,
    status: value.status,
    publicContactEmail: value.publicContactEmail,
    version: value.version,
    publishedVersion: value.publishedVersion,
    publishedAt: value.publishedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...(includePrivate
      ? {
          publishedBy: value.publishedBy,
          unpublishedAt: value.unpublishedAt,
          archivedAt: value.archivedAt,
          notification: value.notification,
          createdBy: value.createdBy,
          updatedBy: value.updatedBy,
        }
      : {}),
  };
}

function publicContactFor(contact) {
  if (!contact || !contact.showPublicContact) return null;

  const publicContact = {
    name: contact.name || '',
    email: contact.publicEmail || '',
    phone: contact.publicPhone || '',
    department: contact.department || '',
  };

  if (
    !publicContact.name &&
    !publicContact.email &&
    !publicContact.phone &&
    !publicContact.department
  ) {
    return null;
  }

  return publicContact;
}

function registrationOpenFor(event) {
  if (!event) return false;
  if (!['published', 'ongoing'].includes(event.status)) return false;

  const now = new Date();
  const opensAt = event.registrationOpens || event.createdAt || now;
  const closesAt = event.registrationCloses || event.startDateTime;

  if (now < new Date(opensAt) || now > new Date(closesAt)) return false;
  if (event.capacity && (event.registrationCount || 0) >= event.capacity) return false;

  return true;
}

export function resolveActivity(activity, options = {}) {
  const {
    includePrivate = false,
    authenticated = false,
  } = options;

  const value = toPlain(activity);
  const event = eventIdOf(value);
  const startDateTime = event?.startDateTime || value.startDateTime;
  const endDateTime = event?.endDateTime || value.endDateTime;
  const venue = event?.venue || value.venue || {};
  const contact = includePrivate
    ? value.contact || null
    : publicContactFor(value.contact);

  return {
    id: value._id,
    _id: value._id,
    weeklyProgramId: value.weeklyProgramId?._id || value.weeklyProgramId,
    source: value.source || (event ? 'event' : 'standalone'),
    eventId: event?._id || value.eventId || null,
    title: event?.title || value.title || '',
    slug: event?.slug || value.slug || '',
    description: event?.description || value.description || '',
    shortDescription: event?.shortDescription || '',
    activityType: value.activityType || 'other',
    project: value.project || '',
    department: value.department || '',
    referenceCode: value.referenceCode || '',
    startDateTime,
    endDateTime,
    timezone: event?.timezone || value.timezone || 'Africa/Lagos',
    allDay: Boolean(value.allDay),
    venue,
    mode: value.mode || 'physical',
    meetingUrl:
      includePrivate || authenticated ? value.meetingUrl || '' : '',
    contact,
    internalNotes: includePrivate ? value.internalNotes || '' : undefined,
    visibility: value.visibility || 'public',
    status: value.status || 'draft',
    bannerImage: value.bannerImage || event?.bannerImage || '',
    thumbnail: value.thumbnail || event?.thumbnail || '',
    publishedAt: value.publishedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    dayKey: startDateTime ? toDateOnlyString(startDateTime) : '',
    isMultiDay: isMultiDay(startDateTime, endDateTime),
    event: event
      ? {
          id: event._id,
          _id: event._id,
          title: event.title,
          slug: event.slug,
          status: event.status,
          category: event.category,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          registrationOpens: event.registrationOpens,
          registrationCloses: event.registrationCloses,
          capacity: event.capacity,
          registrationCount: event.registrationCount,
          checkInEnabled: event.checkInEnabled,
          certificateEnabled: event.certificateEnabled,
          feedbackEnabled: event.feedbackEnabled,
        }
      : null,
    capabilities: {
      registration: Boolean(event),
      attendance: Boolean(event?.checkInEnabled),
      certificates: Boolean(event?.certificateEnabled),
      feedback: Boolean(event?.feedbackEnabled),
    },
    registrationOpen: registrationOpenFor(event),
  };
}

function linkedEventIsPublic(activity) {
  // A standalone activity has no event to check. A linked activity whose event
  // was deleted or can no longer be populated must stay hidden rather than
  // falling back to stale standalone fields.
  if (activity.source !== 'event' && !activity.eventId) return true;

  const event = eventIdOf(activity);
  if (!event) return false;
  return PUBLIC_EVENT_STATUSES.includes(event.status);
}

export function activityIsVisible(
  activity,
  { adminPreview = false, viewer = null } = {}
) {
  if (adminPreview) return activity.status !== 'archived';

  if (activity.status !== 'published') return false;
  if (!linkedEventIsPublic(activity)) return false;

  if (activity.visibility === 'public') return true;
  if (activity.visibility === 'authenticated') return Boolean(viewer);
  return false;
}

function countActivities(activities) {
  return {
    total: activities.length,
    published: activities.filter((activity) => activity.status === 'published').length,
    draft: activities.filter((activity) => activity.status === 'draft').length,
    archived: activities.filter((activity) => activity.status === 'archived').length,
    multiDay: activities.filter((activity) => activity.isMultiDay).length,
  };
}

export async function loadWeekSchedule({
  weekStart,
  adminPreview = false,
  viewer = null,
  userRole = null,
  includeArchived = false,
} = {}) {
  let normalized;
  try {
    normalized = normalizeWeekStart(weekStart);
  } catch (error) {
    throw new AppError(error.message, 400);
  }

  const meta = buildWeekMeta(normalized);
  const program = await WeeklyProgram.findOne({ weekStart: meta.weekStart });

  if (!program) {
    return {
      ...meta,
      program: null,
      status: 'empty',
      activities: [],
      counts: countActivities([]),
      excluded: [],
    };
  }

  if (!adminPreview && program.status !== 'published') {
    return {
      ...meta,
      program: null,
      status: 'empty',
      activities: [],
      counts: countActivities([]),
      excluded: [],
    };
  }

  const query = { weeklyProgramId: program._id };
  if (!adminPreview) {
    query.status = 'published';
  } else if (!includeArchived) {
    query.status = { $ne: 'archived' };
  }

  const rawActivities = await WeeklyActivity.find(query)
    .populate('eventId')
    .sort({ startDateTime: 1, title: 1 });

  const pairs = rawActivities
    .map((raw) => ({
      raw,
      resolved: resolveActivity(raw, {
        includePrivate: adminPreview,
        authenticated: Boolean(viewer),
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

  const visiblePairs = pairs.filter(({ raw }) =>
    activityIsVisible(raw, { adminPreview, viewer })
  );

  const resolved = visiblePairs
    .map(({ resolved: activity }) => activity)
    .sort((a, b) => {
      const startDiff = new Date(a.startDateTime) - new Date(b.startDateTime);
      if (startDiff !== 0) return startDiff;
      return String(a.title).localeCompare(String(b.title));
    });

  // Never expose hidden activity titles to participants. We only report
  // aggregate reasons so the UI can prompt for sign-in without leaking data.
  const excludedCounts = pairs
    .filter(({ raw }) => !activityIsVisible(raw, { adminPreview, viewer }))
    .reduce((counts, { resolved: activity }) => {
      const reason =
        activity.visibility === 'staff'
          ? 'staff_only'
          : activity.visibility === 'authenticated' && !viewer
            ? 'sign_in_required'
            : activity.status !== 'published'
              ? 'unpublished'
              : 'restricted';
      counts[reason] = (counts[reason] || 0) + 1;
      return counts;
    }, {});

  const excluded = adminPreview
    ? []
    : Object.entries(excludedCounts).map(([reason, count]) => ({
        reason,
        count,
      }));

  return {
    ...meta,
    program: serializeProgram(program, { includePrivate: adminPreview }),
    status: program.status,
    activities: resolved,
    counts: adminPreview
      ? countActivities(pairs.map(({ resolved: activity }) => activity))
      : countActivities(resolved),
    excluded,
    viewerRole: userRole,
  };
}

export async function loadPreviewSchedule(program) {
  const meta = buildWeekMeta(program.weekStart);
  const rawActivities = await WeeklyActivity.find({
    weeklyProgramId: program._id,
    status: { $ne: 'archived' },
  })
    .populate('eventId')
    .sort({ startDateTime: 1, title: 1 });

  const resolved = rawActivities
    .map((activity) =>
      resolveActivity(activity, {
        includePrivate: false,
        authenticated: false,
      })
    )
    .filter((activity) =>
      overlapsWeek(
        activity.startDateTime,
        activity.endDateTime,
        meta.weekStart,
        meta.weekEnd
      )
    )
    .sort((a, b) => {
      const startDiff = new Date(a.startDateTime) - new Date(b.startDateTime);
      if (startDiff !== 0) return startDiff;
      return String(a.title).localeCompare(String(b.title));
    });

  return {
    ...meta,
    program: serializeProgram(program, { includePrivate: false }),
    status: program.status,
    activities: resolved,
    counts: countActivities(resolved),
    excluded: [],
    preview: true,
  };
}

export async function getProgramById(id, { includePrivate = true } = {}) {
  const program = await WeeklyProgram.findById(id);
  if (!program) throw new AppError('Weekly program not found', 404);
  return {
    program,
    serialized: serializeProgram(program, { includePrivate }),
  };
}

export async function getActivityForAdmin(programId, activityId) {
  const activity = await WeeklyActivity.findOne({
    _id: activityId,
    weeklyProgramId: programId,
  }).populate('eventId');

  if (!activity) throw new AppError('Weekly activity not found', 404);
  return {
    activity,
    resolved: resolveActivity(activity, { includePrivate: true }),
  };
}

export async function getPublicActivity(activityId, { viewer = null } = {}) {
  const activity = await WeeklyActivity.findById(activityId)
    .populate('eventId')
    .populate('weeklyProgramId');

  if (!activity) throw new AppError('Weekly activity not found', 404);

  const program = activity.weeklyProgramId;
  if (!program || program.status !== 'published') {
    throw new AppError('Weekly activity not found', 404);
  }

  if (activity.status !== 'published') {
    throw new AppError('Weekly activity not found', 404);
  }

  if (activity.visibility === 'staff') {
    throw new AppError('Weekly activity not found', 404);
  }

  if (activity.visibility === 'authenticated' && !viewer) {
    throw new AppError('Please sign in to view this activity', 401);
  }

  if (!linkedEventIsPublic(activity)) {
    throw new AppError('Weekly activity not found', 404);
  }

  return {
    activity,
    program,
    resolved: resolveActivity(activity, {
      includePrivate: false,
      authenticated: Boolean(viewer),
    }),
  };
}

export async function getPublicActivitiesForProgram(program, { viewer = null } = {}) {
  const rawActivities = await WeeklyActivity.find({
    weeklyProgramId: program._id,
    status: 'published',
  })
    .populate('eventId')
    .sort({ startDateTime: 1, title: 1 });

  return rawActivities
    .filter((activity) => activityIsVisible(activity, { viewer }))
    .map((activity) =>
      resolveActivity(activity, {
        includePrivate: false,
        authenticated: Boolean(viewer),
      })
    )
    .filter((activity) =>
      overlapsWeek(
        activity.startDateTime,
        activity.endDateTime,
        program.weekStart,
        program.weekEnd
      )
    )
    .sort((a, b) => {
      const startDiff = new Date(a.startDateTime) - new Date(b.startDateTime);
      if (startDiff !== 0) return startDiff;
      return String(a.title).localeCompare(String(b.title));
    });
}

export async function touchProgram(programId, adminId, { incrementVersion = true } = {}) {
  const update = {
    updatedBy: adminId,
  };
  if (incrementVersion) update.$inc = { version: 1 };

  return WeeklyProgram.findByIdAndUpdate(programId, update, { new: true });
}

export {
  publicContactFor,
  registrationOpenFor,
  serializeProgram,
};
