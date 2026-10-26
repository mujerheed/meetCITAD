import {
  formatDateLong,
  formatDateShort,
  formatTime,
  formatWeekRange,
  getWeekRange,
} from '../utils/week.js';

const DEFAULT_PUBLIC_CONTACT = 'info@citad.org';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function venueLabel(activity) {
  const venue = activity.venue || {};
  const name = venue.name || '';

  if (activity.mode === 'virtual') {
    return name ? `${name} (Virtual)` : 'Virtual';
  }

  const parts = [name, venue.city, venue.state, venue.region].filter(Boolean);
  const label = parts.join(', ') || 'CITAD, Kano';

  return activity.mode === 'hybrid' ? `${label} (Hybrid)` : label;
}

export function formatActivityTime(activity, timeZone = 'Africa/Lagos') {
  if (activity.allDay) return 'All day';
  const start = formatTime(activity.startDateTime, timeZone);
  const end = formatTime(activity.endDateTime, timeZone);
  if (!start && !end) return '';
  if (!start) return end;
  return end ? `${start} to ${end}` : start;
}

function contactFor(activity, program) {
  return (
    activity.contact?.email ||
    activity.contact?.publicEmail ||
    program?.publicContactEmail ||
    DEFAULT_PUBLIC_CONTACT
  );
}

function summaryLines(activity, index, program, timeZone) {
  const lines = [`${index + 1}. Event: ${activity.title || 'Untitled activity'}`];
  const venue = venueLabel(activity);
  if (venue) lines.push(`   Venue: ${venue}`);

  const startDate = formatDateLong(activity.startDateTime, timeZone);
  const endDate = formatDateLong(activity.endDateTime, timeZone);
  if (startDate) lines.push(`   Start Date: ${startDate}`);
  if (endDate) lines.push(`   End Date: ${endDate}`);

  const time = formatActivityTime(activity, timeZone);
  if (time) lines.push(`   Time: ${time}`);

  const contact = contactFor(activity, program);
  if (contact) lines.push(`   For more info: ${contact}`);

  return lines;
}

export function buildWeeklySummary({
  program,
  activities = [],
  format = 'whatsapp',
  timeZone = 'Africa/Lagos',
} = {}) {
  if (!program) {
    throw new Error('Weekly program is required');
  }

  const { weekEndInclusive } = getWeekRange(program.weekStart, timeZone);
  const range = formatWeekRange(
    program.weekStart,
    weekEndInclusive,
    timeZone
  ).replace(' to ', ' TO ');
  const sorted = [...activities].sort((a, b) => {
    const startDiff = new Date(a.startDateTime) - new Date(b.startDateTime);
    if (startDiff !== 0) return startDiff;
    return String(a.title || '').localeCompare(String(b.title || ''));
  });

  const heading = `EVENTS AND PROGRAMS FOR THE WEEK ${range}.`;
  const lines = [];

  if (format === 'email') {
    lines.push('Dear colleagues,');
    lines.push('');
    lines.push(
      `Please find below the events and programmes scheduled for the week ${range}.`
    );
    lines.push('');
    lines.push(heading);
  } else {
    lines.push(`*${heading}*`);
  }

  lines.push('');

  if (sorted.length === 0) {
    lines.push('No published activities are scheduled for this week.');
  } else {
    sorted.forEach((activity, index) => {
      lines.push(...summaryLines(activity, index, program, timeZone));
      if (index < sorted.length - 1) lines.push('');
    });
  }

  if (format === 'email') {
    lines.push('');
    lines.push('Kind regards,');
    lines.push('CITAD');
    lines.push(program.publicContactEmail || DEFAULT_PUBLIC_CONTACT);
  } else {
    lines.push('');
    lines.push('CITAD | Centre for Information Technology and Development');
  }

  return {
    format,
    text: lines.join('\n').trim(),
    activityCount: sorted.length,
    generatedAt: new Date(),
    weekStart: program.weekStart,
    weekEndInclusive,
    range,
  };
}

export function renderSummaryHtml({
  program,
  activities = [],
  timeZone = 'Africa/Lagos',
} = {}) {
  const { weekEndInclusive } = getWeekRange(program.weekStart, timeZone);
  const range = formatWeekRange(program.weekStart, weekEndInclusive, timeZone);
  // The printable document uses the same institutional heading as the
  // WhatsApp/email variants, never the email salutation.
  const heading = `EVENTS AND PROGRAMS FOR THE WEEK ${range.replace(
    ' to ',
    ' TO '
  )}.`;
  const rows = [...activities]
    .sort(
      (a, b) =>
        new Date(a.startDateTime) - new Date(b.startDateTime) ||
        String(a.title || '').localeCompare(String(b.title || ''))
    )
    .map((activity) => {
      const venue = escapeHtml(venueLabel(activity));
      const start = escapeHtml(formatDateLong(activity.startDateTime, timeZone));
      const end = escapeHtml(formatDateLong(activity.endDateTime, timeZone));
      const time = escapeHtml(formatActivityTime(activity, timeZone));
      const contact = escapeHtml(contactFor(activity, program));

      return `
        <article class="activity">
          <h2>${escapeHtml(activity.title || 'Untitled activity')}</h2>
          <dl>
            <dt>Venue</dt><dd>${venue}</dd>
            <dt>Start Date</dt><dd>${start}</dd>
            <dt>End Date</dt><dd>${end}</dd>
            <dt>Time</dt><dd>${time}</dd>
            <dt>For more info</dt><dd>${contact}</dd>
          </dl>
        </article>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CITAD Weekly Programs ${escapeHtml(formatDateShort(program.weekStart, timeZone))}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; background: #fff; color: #374151; font-family: Inter, Arial, sans-serif; line-height: 1.55; }
    main { max-width: 900px; margin: 0 auto; }
    header { border-bottom: 4px solid #C9A44C; padding-bottom: 18px; margin-bottom: 24px; }
    .brand { color: #0F2A44; font-size: 0.8rem; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    h1 { color: #0F2A44; font-size: 1.55rem; margin: 8px 0 4px; }
    .meta { color: #6B7280; font-size: 0.9rem; }
    .activity { border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 20px; margin: 0 0 14px; page-break-inside: avoid; }
    h2 { color: #0F2A44; font-size: 1.05rem; margin: 0 0 10px; }
    dl { display: grid; grid-template-columns: 120px 1fr; gap: 5px 14px; margin: 0; font-size: 0.92rem; }
    dt { color: #6B7280; font-weight: 600; }
    dd { margin: 0; }
    footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 0.8rem; }
    @media print { body { padding: 0; } .activity { break-inside: avoid; } }
    @media (max-width: 600px) { body { padding: 18px; } dl { grid-template-columns: 1fr; } dt { margin-top: 6px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="brand">CITAD meetCITAD</div>
      <h1>${escapeHtml(heading)}</h1>
      <div class="meta">Week ${escapeHtml(range)}</div>
    </header>
    ${rows || '<p>No published activities are scheduled for this week.</p>'}
    <footer>
      Centre for Information Technology and Development (CITAD), Kano, Nigeria<br />
      ${escapeHtml(program.publicContactEmail || DEFAULT_PUBLIC_CONTACT)}
    </footer>
  </main>
</body>
</html>`;
}

export function summaryFileName(program, extension = 'txt') {
  const date = program?.weekStart
    ? formatDateShort(program.weekStart).replace(/-/g, '')
    : 'weekly-program';
  return `citad-weekly-${date}.${extension}`;
}

export default {
  buildWeeklySummary,
  renderSummaryHtml,
  summaryFileName,
  venueLabel,
  formatActivityTime,
};
