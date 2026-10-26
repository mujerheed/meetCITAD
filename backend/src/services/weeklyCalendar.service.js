import { createEventsAsync } from 'ics';
import sanitizeHtml from 'sanitize-html';
import { formatDateShort } from '../utils/week.js';
import { venueLabel } from './weeklySummary.service.js';

function utcArray(value) {
  const date = new Date(value);
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ];
}

function plainDescription(activity) {
  if (!activity.description) return '';
  return sanitizeHtml(String(activity.description), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, ' ')
    .trim();
}

function toCalendarEvent(activity) {
  const descriptionParts = [];
  const description = plainDescription(activity);
  if (description) descriptionParts.push(description);

  if (activity.project) descriptionParts.push(`Project: ${activity.project}`);
  if (activity.department) {
    descriptionParts.push(`Department: ${activity.department}`);
  }
  if (activity.contact?.email) {
    descriptionParts.push(`Contact: ${activity.contact.email}`);
  }

  return {
    uid: `weekly-${activity.id}@meet.citad.org`,
    start: utcArray(activity.startDateTime),
    end: utcArray(activity.endDateTime),
    startInputType: 'utc',
    startOutputType: 'utc',
    endInputType: 'utc',
    endOutputType: 'utc',
    title: activity.title || 'CITAD Weekly Activity',
    description: descriptionParts.join('\n\n'),
    location: venueLabel(activity),
    url: activity.meetingUrl || undefined,
    categories: ['CITAD', 'Weekly Program', activity.activityType].filter(Boolean),
    calName: 'CITAD Weekly Programs',
    productId: 'meetCITAD',
    busyStatus: 'BUSY',
    status: 'CONFIRMED',
  };
}

export async function buildCalendar(activities = [], { filename } = {}) {
  const events = activities
    .filter((activity) => activity.startDateTime && activity.endDateTime)
    .map(toCalendarEvent);

  if (events.length === 0) {
    return { error: null, value: null, filename, activityCount: 0 };
  }

  const result = await createEventsAsync(events, {
    productId: 'meetCITAD',
    calName: 'CITAD Weekly Programs',
  });

  if (result.error) throw result.error;

  return {
    ...result,
    filename,
    activityCount: events.length,
  };
}

export function calendarFileName(program, activity = null) {
  if (activity) {
    const slug =
      activity.slug ||
      String(activity.title || 'activity')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'activity';
    return `citad-${slug}.ics`;
  }

  const date = program?.weekStart
    ? formatDateShort(program.weekStart).replace(/-/g, '')
    : 'weekly';
  return `citad-weekly-${date}.ics`;
}

export default {
  buildCalendar,
  calendarFileName,
};
