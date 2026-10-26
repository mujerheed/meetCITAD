/**
 * Week and timezone helpers for the Weekly Program Schedule module.
 *
 * meetCITAD schedules are authored and displayed in Africa/Lagos (WAT, UTC+1).
 * Dates are stored as UTC instants. These helpers convert between a timezone's
 * local calendar and UTC without adding a date library dependency.
 */

export const DEFAULT_TIMEZONE = 'Africa/Lagos';

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value) {
  return String(value).padStart(2, '0');
}

function partsToObject(parts) {
  return parts.reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
}

export function getZonedParts(date, timeZone = DEFAULT_TIMEZONE) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid date');
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long',
    hourCycle: 'h23',
  });

  const parts = partsToObject(formatter.formatToParts(value));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

function timeZoneOffsetMs(date, timeZone = DEFAULT_TIMEZONE) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Convert a wall-clock date/time in a timezone to the corresponding UTC Date.
 */
export function zonedDateTimeToUtc(
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  timeZone = DEFAULT_TIMEZONE
) {
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = target;

  // Two passes handle offset changes around DST boundaries in other zones.
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const offset = timeZoneOffsetMs(new Date(guess), timeZone);
    guess = target - offset;
  }

  return new Date(guess);
}

export function parseDateOnly(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    };
  }

  if (typeof value !== 'string') return null;
  const match = DATE_ONLY_RE.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function toDateOnlyString(value, timeZone = DEFAULT_TIMEZONE) {
  if (!value) return '';
  const parts = getZonedParts(value, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function startOfWeekForDate(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const parts = getZonedParts(date, timeZone);
  const localDayUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const weekday = new Date(localDayUtc).getUTCDay(); // 0 Sunday, 1 Monday
  const daysSinceMonday = (weekday + 6) % 7;
  const monday = new Date(localDayUtc - daysSinceMonday * 24 * 60 * 60 * 1000);

  return zonedDateTimeToUtc(
    monday.getUTCFullYear(),
    monday.getUTCMonth() + 1,
    monday.getUTCDate(),
    0,
    0,
    0,
    timeZone
  );
}

export function addDaysInTimeZone(date, days, timeZone = DEFAULT_TIMEZONE) {
  const parts = getZonedParts(date, timeZone);
  const local = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day) + days * 24 * 60 * 60 * 1000
  );

  return zonedDateTimeToUtc(
    local.getUTCFullYear(),
    local.getUTCMonth() + 1,
    local.getUTCDate(),
    0,
    0,
    0,
    timeZone
  );
}

export function endOfWeekForStart(weekStart, timeZone = DEFAULT_TIMEZONE) {
  return addDaysInTimeZone(weekStart, 7, timeZone);
}

export function inclusiveWeekEnd(weekStart, timeZone = DEFAULT_TIMEZONE) {
  return addDaysInTimeZone(weekStart, 6, timeZone);
}

export function normalizeWeekStart(input, timeZone = DEFAULT_TIMEZONE) {
  if (input === undefined || input === null || input === '') {
    return startOfWeekForDate(new Date(), timeZone);
  }

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) throw new Error('Invalid week start');
    return startOfWeekForDate(input, timeZone);
  }

  if (typeof input === 'string') {
    const parsed = parseDateOnly(input);
    if (!parsed) throw new Error('Week start must use YYYY-MM-DD');
    const utc = zonedDateTimeToUtc(
      parsed.year,
      parsed.month,
      parsed.day,
      0,
      0,
      0,
      timeZone
    );
    return startOfWeekForDate(utc, timeZone);
  }

  throw new Error('Invalid week start');
}

export function getWeekRange(weekStart, timeZone = DEFAULT_TIMEZONE) {
  const start = normalizeWeekStart(weekStart, timeZone);
  return {
    weekStart: start,
    weekEnd: endOfWeekForStart(start, timeZone),
    weekEndInclusive: inclusiveWeekEnd(start, timeZone),
  };
}

export function overlapsWeek(startDateTime, endDateTime, weekStart, weekEnd) {
  if (!startDateTime || !endDateTime) return false;
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  return start < weekEnd && end >= weekStart;
}

export function isMultiDay(startDateTime, endDateTime, timeZone = DEFAULT_TIMEZONE) {
  if (!startDateTime || !endDateTime) return false;
  return (
    toDateOnlyString(startDateTime, timeZone) !==
    toDateOnlyString(endDateTime, timeZone)
  );
}

export function formatDateLong(value, timeZone = DEFAULT_TIMEZONE) {
  if (!value) return '';
  const parts = getZonedParts(value, timeZone);
  return `${parts.weekday} ${pad(parts.day)}-${pad(parts.month)}-${parts.year}`;
}

export function formatDateShort(value, timeZone = DEFAULT_TIMEZONE) {
  if (!value) return '';
  const parts = getZonedParts(value, timeZone);
  return `${pad(parts.day)}-${pad(parts.month)}-${parts.year}`;
}

export function formatWeekRange(weekStart, weekEndInclusive, timeZone = DEFAULT_TIMEZONE) {
  return `${formatDateShort(weekStart, timeZone)} to ${formatDateShort(
    weekEndInclusive,
    timeZone
  )}`;
}

export function formatWeekLabel(weekStart, weekEndInclusive, timeZone = DEFAULT_TIMEZONE) {
  return `Week of ${formatDateShort(weekStart, timeZone)} to ${formatDateShort(
    weekEndInclusive,
    timeZone
  )}`;
}

export function formatTime(value, timeZone = DEFAULT_TIMEZONE) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatDateTime(value, timeZone = DEFAULT_TIMEZONE) {
  if (!value) return '';
  return `${formatDateLong(value, timeZone)} at ${formatTime(value, timeZone)}`;
}

export function dateToLocalArray(value, timeZone = DEFAULT_TIMEZONE) {
  const parts = getZonedParts(value, timeZone);
  return [parts.year, parts.month, parts.day, parts.hour, parts.minute];
}

export function getWeekDateKeys(weekStart, timeZone = DEFAULT_TIMEZONE) {
  return Array.from({ length: 7 }, (_, index) =>
    toDateOnlyString(addDaysInTimeZone(weekStart, index, timeZone), timeZone)
  );
}

export function buildWeekMeta(weekStart, timeZone = DEFAULT_TIMEZONE) {
  const range = getWeekRange(weekStart, timeZone);
  return {
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    weekEndInclusive: range.weekEndInclusive,
    weekLabel: formatWeekLabel(
      range.weekStart,
      range.weekEndInclusive,
      timeZone
    ),
    weekRange: formatWeekRange(
      range.weekStart,
      range.weekEndInclusive,
      timeZone
    ),
  };
}

export default {
  DEFAULT_TIMEZONE,
  getZonedParts,
  zonedDateTimeToUtc,
  parseDateOnly,
  toDateOnlyString,
  startOfWeekForDate,
  addDaysInTimeZone,
  endOfWeekForStart,
  inclusiveWeekEnd,
  normalizeWeekStart,
  getWeekRange,
  overlapsWeek,
  isMultiDay,
  formatDateLong,
  formatDateShort,
  formatWeekRange,
  formatWeekLabel,
  formatTime,
  formatDateTime,
  dateToLocalArray,
  getWeekDateKeys,
  buildWeekMeta,
};
