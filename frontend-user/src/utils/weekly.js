const AFRICA_LAGOS = 'Africa/Lagos'

const dateOnlyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: AFRICA_LAGOS,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: AFRICA_LAGOS,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
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
  month: 'long',
  year: 'numeric',
})

export const ACTIVITY_TYPES = {
  event: 'Event',
  meeting: 'Meeting',
  training: 'Training',
  field_activity: 'Field activity',
  campaign: 'Campaign',
  survey: 'Survey',
  research: 'Research',
  assignment: 'Assignment',
  other: 'Activity',
}

export const VISIBILITY_LABELS = {
  public: 'Public',
  authenticated: 'Signed-in participants',
  staff: 'Staff only',
}

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

export function mondayOf(dateKey) {
  if (!dateKey) return ''
  const date = new Date(`${dateKey}T00:00:00Z`)
  const offset = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - offset)
  return date.toISOString().slice(0, 10)
}

export function formatDayLabel(dateKey) {
  if (!dateKey) return ''
  return dayFormatter.format(new Date(`${dateKey}T12:00:00Z`))
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

export function activityTypeLabel(value) {
  return ACTIVITY_TYPES[value] || 'Activity'
}

export function visibilityLabel(value) {
  return VISIBILITY_LABELS[value] || value
}

export function venueLabel(activity) {
  const venue = activity?.venue || {}
  const parts = [venue.name, venue.city, venue.state].filter(Boolean)
  const base = parts.join(', ') || 'CITAD, Kano'
  if (activity?.mode === 'virtual') {
    return parts[0] ? `${parts[0]} · Virtual` : 'Virtual'
  }
  if (activity?.mode === 'hybrid') return `${base} · Hybrid`
  return base
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
