/**
 * Calendar helpers for adding meetCITAD events to external calendars.
 */

const toDate = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getEventWindow(event) {
  const start = toDate(event?.startDate || event?.startDateTime || event?.date)
  if (!start) return { start: null, end: null }

  let end = toDate(event?.endDate || event?.endDateTime)
  if (!end || end <= start) {
    end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  }

  return { start, end }
}

function toICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeICS(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function plainText(value = '') {
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .trim()
}

function foldLine(line) {
  if (line.length <= 74) return line

  const parts = []
  let rest = line
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74))
    rest = ` ${rest.slice(74)}`
  }
  parts.push(rest)
  return parts.join('\r\n')
}

export function buildEventICS(event) {
  const { start, end } = getEventWindow(event)
  if (!start || !end) return ''

  const location =
    event.location || event.venueName || event.venue?.name || 'CITAD, Kano'
  const description = plainText(event.description || event.shortDescription || '')
  const eventUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/events/${event._id}`
      : ''

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CITAD//meetCITAD//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event._id || Date.now()}@meetcitad`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeICS(event.title || 'CITAD Event')}`,
    `DESCRIPTION:${escapeICS(`${description}\n\n${eventUrl}`.trim())}`,
    `LOCATION:${escapeICS(location)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return `${lines.map(foldLine).join('\r\n')}\r\n`
}

export function downloadEventICS(event) {
  const content = buildEventICS(event)
  if (!content) return false

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const name = (event.title || 'citad-event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  link.href = url
  link.download = `${name || 'citad-event'}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return true
}

export function googleCalendarUrl(event) {
  const { start, end } = getEventWindow(event)
  if (!start || !end) return ''

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'CITAD Event',
    dates: `${toICSDate(start)}/${toICSDate(end)}`,
    details: plainText(event.description || ''),
    location: event.location || event.venueName || 'CITAD, Kano',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function outlookCalendarUrl(event) {
  const { start, end } = getEventWindow(event)
  if (!start || !end) return ''

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title || 'CITAD Event',
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: plainText(event.description || ''),
    location: event.location || event.venueName || 'CITAD, Kano',
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
