/**
 * Data normalizers
 *
 * The v2 backend stores events, users and certificates with slightly different
 * field names than the v1 data the first frontend views were built against.
 * These helpers keep every view working with one predictable shape.
 */

const FALLBACK_BANNER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'

const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ??
  (import.meta.env.DEV ? 'http://localhost:4000' : '')

export function resolveMediaUrl(url) {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatTime(value) {
  const date = toDate(value)
  if (!date) return ''
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function titleCase(value) {
  if (!value) return ''
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function normalizeUser(raw) {
  if (!raw) return null

  const source = { ...raw }
  const fullname =
    source.fullname ||
    source.name ||
    [source.firstName, source.lastName].filter(Boolean).join(' ')

  const nameParts = fullname ? fullname.trim().split(/\s+/) : []
  const firstName = source.firstName || nameParts[0] || ''
  const lastName =
    source.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '')

  const profilePicture =
    source.profilePicture || source.profileImage || source.avatar || null

  return {
    ...source,
    _id: source._id || source.id || '',
    id: source.id || source._id || '',
    fullname,
    name: fullname || source.email || 'Account',
    firstName,
    lastName,
    profilePicture: profilePicture ? resolveMediaUrl(profilePicture) : null,
    profileImage: profilePicture,
    organisation: source.organisation || source.organization || '',
    organization: source.organization || source.organisation || '',
    biography: source.biography || source.bio || '',
    bio: source.bio || source.biography || '',
    jobTitle: source.jobTitle || '',
    participantType: source.participantType || '',
    stats: {
      totalEventsRegistered: source.stats?.totalEventsRegistered || 0,
      totalEventsAttended: source.stats?.totalEventsAttended || 0,
      totalCertificates: source.stats?.totalCertificates || 0,
      points: source.stats?.points || 0,
      ...source.stats,
    },
    preferences: {
      ...source.preferences,
      emailNotifications:
        source.preferences?.emailNotifications ??
        source.preferences?.notifications?.email ??
        true,
      smsNotifications:
        source.preferences?.smsNotifications ??
        source.preferences?.notifications?.sms ??
        false,
      pushNotifications:
        source.preferences?.pushNotifications ??
        source.preferences?.notifications?.push ??
        true,
    },
  }
}

/**
 * Normalizes an event document from any of the v1/v2 shapes into one shape
 * used by the views (startDate, location, banner, attendees, capacity...).
 */
export function normalizeEvent(raw) {
  if (!raw) return null
  if (typeof raw === 'string') raw = { _id: raw }
  const source = { ...raw }

  const start = source.startDateTime || source.startDate || source.date || null
  const end = source.endDateTime || source.endDate || source.date || null
  const startDate = toDate(start)
  const endDate = toDate(end)

  const venueObject =
    source.venue && typeof source.venue === 'object' ? source.venue : null
  const venueName =
    (typeof source.venue === 'string' && source.venue) ||
    venueObject?.name ||
    source.location ||
    'CITAD Center, Kano'

  const registrations = source.registeredUsers || source.attendees || []
  const attendees = registrations.map((registration) => {
    if (registration && typeof registration === 'object') {
      if (registration.userId) {
        const user =
          typeof registration.userId === 'object'
            ? registration.userId
            : { _id: registration.userId }
        return {
          ...user,
          _id: user._id || user.id,
          registrationStatus: registration.status,
          registeredAt: registration.registeredAt,
        }
      }
      return registration
    }
    return { _id: registration }
  })

  const capacity = source.capacity ?? source.maxAttendees ?? null
  const registeredCount =
    source.registeredCount ?? source.registrationCount ?? attendees.length

  const category = titleCase(source.category)

  return {
    ...source,
    _id: source._id || source.id || '',
    id: source.id || source._id || '',
    banner: resolveMediaUrl(source.bannerImage || source.banner) || FALLBACK_BANNER,
    bannerImage: source.bannerImage || source.banner || '',
    startDate,
    startDateTime: startDate,
    endDate,
    endDateTime: endDate,
    startTime: source.startTime || formatTime(start),
    endTime: source.endTime || formatTime(end),
    location: venueName,
    venue: source.venue || venueName,
    venueName,
    category,
    capacity,
    maxAttendees: capacity,
    attendees,
    registeredCount,
    registrationCount: registeredCount,
    spotsLeft:
      source.spotsLeft ?? (capacity ? Math.max(0, capacity - registeredCount) : null),
    agenda: Array.isArray(source.agenda) ? source.agenda : [],
    status: source.status || 'published',
    isPast: endDate ? endDate < new Date() : false,
    registrationStatus:
      source.registration?.status ||
      source.registrationStatus ||
      (endDate && endDate < new Date() ? 'past' : 'open'),
  }
}

/**
 * A registration record from GET /users/events/registered is a wrapper:
 * { event: <Event>, status, registeredAt, attended, ... }
 */
export function normalizeRegisteredEvent(raw) {
  if (!raw) return null
  const eventSource = raw.event || raw.eventId || raw
  const event = normalizeEvent(eventSource)

  const registration = raw.registration || {
    status: raw.status || 'confirmed',
    registeredAt: raw.registeredAt || null,
    attended: Boolean(raw.attended),
    attendedAt: raw.attendedAt || null,
    certificateIssued: Boolean(raw.certificateIssued),
    qrCode: raw.qrCode || null,
  }

  return {
    ...event,
    registration,
    attended: Boolean(
      registration.attended || registration.status === 'attended'
    ),
    registeredAt: registration.registeredAt,
    certificateIssued: Boolean(registration.certificateIssued),
  }
}

export function normalizeCertificate(raw) {
  if (!raw) return null
  const source = { ...raw }

  return {
    ...source,
    _id: source._id || source.id || '',
    id: source.id || source._id || '',
    title:
      source.eventTitle ||
      source.event?.title ||
      source.title ||
      'Certificate of Participation',
    eventTitle: source.eventTitle || source.event?.title || '',
    eventDate: toDate(source.eventDate || source.event?.date || source.issuedDate),
    issuedDate: toDate(source.issuedDate || source.createdAt),
    recipientName: source.recipientName || '',
    certificateNumber: source.certificateNumber || source.certificateId || '',
    status: source.status || 'active',
    fileUrl: resolveMediaUrl(source.fileUrl || source.downloadUrl || ''),
    verificationHash: source.verificationHash || '',
    verificationUrl: source.verificationUrl || '',
  }
}

export function normalizeNotification(raw) {
  if (!raw) return null
  const source = { ...raw }
  const relatedEvent = source.relatedEvent

  return {
    ...source,
    _id: source._id || source.id || '',
    title: source.title || 'Notification',
    message: source.message || source.body || source.description || '',
    type: source.type || 'system',
    read: Boolean(source.read ?? source.isRead ?? source.readAt),
    createdAt: source.createdAt || source.sentAt || new Date().toISOString(),
    link:
      source.link ||
      (relatedEvent
        ? `/events/${relatedEvent._id || relatedEvent}`
        : null),
  }
}

export { FALLBACK_BANNER, titleCase }
