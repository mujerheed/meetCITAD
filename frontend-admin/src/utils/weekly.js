const AFRICA_LAGOS = 'Africa/Lagos'

const dateOnlyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: AFRICA_LAGOS,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const weekdayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: AFRICA_LAGOS,
  weekday: 'long',
  day: '2-digit',
  month: 'short',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: AFRICA_LAGOS,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const dateLongFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: AFRICA_LAGOS,
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function weekKey(value = new Date()) {
  if (!value) return ''
  return dateOnlyFormatter.format(new Date(value))
}

export function shiftDateKey(dateKey, days) {
  if (!dateKey) return ''
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + Number(days || 0))
  return date.toISOString().slice(0, 10)
}

export function formatDayLabel(dateKey) {
  if (!dateKey) return ''
  return weekdayFormatter.format(new Date(`${dateKey}T12:00:00Z`))
}

export function formatDateLong(value) {
  if (!value) return ''
  return dateLongFormatter.format(new Date(value))
}

export function formatTimeRange(start, end, allDay = false) {
  if (allDay) return 'All day'
  if (!start) return ''
  const startLabel = timeFormatter.format(new Date(start))
  const endLabel = end ? timeFormatter.format(new Date(end)) : ''
  return endLabel ? `${startLabel} - ${endLabel}` : startLabel
}

export function toDateTimeLocal(value) {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: AFRICA_LAGOS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))

  const map = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
  )
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`
}

export function toLagosIso(value) {
  if (!value) return null
  const normalized = value.length === 16 ? `${value}:00` : value
  return new Date(`${normalized}+01:00`).toISOString()
}

export const ACTIVITY_TYPES = [
  { title: 'Event', value: 'event' },
  { title: 'Meeting', value: 'meeting' },
  { title: 'Training', value: 'training' },
  { title: 'Field activity', value: 'field_activity' },
  { title: 'Campaign', value: 'campaign' },
  { title: 'Survey', value: 'survey' },
  { title: 'Research', value: 'research' },
  { title: 'Assignment', value: 'assignment' },
  { title: 'Other', value: 'other' },
]

export const VISIBILITY_OPTIONS = [
  { title: 'Public', value: 'public' },
  { title: 'Signed-in participants', value: 'authenticated' },
  { title: 'Staff only', value: 'staff' },
]

export const STATUS_OPTIONS = [
  { title: 'Draft', value: 'draft' },
  { title: 'Published', value: 'published' },
]

export function activityTypeLabel(value) {
  return ACTIVITY_TYPES.find((item) => item.value === value)?.title || 'Other'
}

export function visibilityLabel(value) {
  return VISIBILITY_OPTIONS.find((item) => item.value === value)?.title || value
}

export function summaryFilename(weekValue, extension = 'txt') {
  const key = weekKey(weekValue).replace(/-/g, '')
  return `citad-weekly-${key}.${extension}`
}
