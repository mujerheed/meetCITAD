import axios from 'axios'
import { cacheClear } from '@/utils/offline'
import {
  normalizeCertificate,
  normalizeEvent,
  normalizeNotification,
  normalizeRegisteredEvent,
} from '@/utils/normalizers'

/**
 * Axios instance for the meetCITAD v2 API.
 *
 * The backend mounts every route under /api/v1 and wraps successful responses:
 *   { success: true, data: { ... } }
 * These helpers unwrap that envelope so stores and views work with plain data.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

const AUTH_FREE_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email']

export function unwrap(response) {
  const body = response?.data

  if (
    body &&
    typeof body === 'object' &&
    Object.prototype.hasOwnProperty.call(body, 'data') &&
    (Object.prototype.hasOwnProperty.call(body, 'success') ||
      Object.prototype.hasOwnProperty.call(body, 'message'))
  ) {
    return body.data
  }

  return body
}

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const response = error?.response
  if (response?.data?.message) return response.data.message
  if (response?.data?.error) return response.data.error
  if (Array.isArray(response?.data?.errors) && response.data.errors.length) {
    return response.data.errors.map((item) => item.message || item.msg || item).join(', ')
  }
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
  if (error?.message === 'Network Error') {
    return 'Unable to reach the server. Please check your connection.'
  }
  return error?.message || fallback
}

// Attach the access token to every request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Session expiry handling.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const token = localStorage.getItem('token')

    if (status === 401 && token) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      cacheClear()

      const currentPath = window.location.pathname
      const isAuthPage = AUTH_FREE_PATHS.some((path) => currentPath.startsWith(path))

      if (!isAuthPage) {
        const redirect = encodeURIComponent(currentPath + window.location.search)
        window.location.assign(`/login?redirect=${redirect}`)
      }
    }

    return Promise.reject(error)
  }
)

function normalizeEventList(data = {}) {
  const rawEvents = Array.isArray(data)
    ? data
    : data.events || data.docs || data.results || []

  const events = rawEvents.map(normalizeEvent)

  const rawPagination = data.pagination || data
  const total =
    rawPagination.totalDocs ??
    rawPagination.total ??
    data.total ??
    events.length
  const limit =
    rawPagination.limit ?? rawPagination.perPage ?? data.limit ?? 12
  const page = rawPagination.page ?? rawPagination.currentPage ?? data.page ?? 1

  return {
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages:
        rawPagination.totalPages ??
        rawPagination.pages ??
        (limit ? Math.ceil(total / limit) : 1),
    },
  }
}

function normalizeNotificationList(data = {}) {
  const rawNotifications = Array.isArray(data)
    ? data
    : data.notifications || data.docs || data.results || []

  const pagination = data.pagination || {
    page: data.page || 1,
    limit: data.limit || rawNotifications.length || 20,
    total: data.total ?? rawNotifications.length,
    pages: data.pages || 1,
  }

  return {
    notifications: rawNotifications.map(normalizeNotification),
    pagination,
    unreadCount:
      data.unreadCount ??
      rawNotifications.filter((notification) => !notification.read).length,
  }
}

/**
 * `GET /users/events/registered` can return entries whose event reference is a
 * bare id (the backend populates `event`, while the schema field is `eventId`).
 * Fill in the event details from the public events list when needed.
 */
async function enrichRegisteredEvents(entries) {
  if (!entries.some((entry) => entry && !entry.title)) return entries

  try {
    const response = await api.get('/events', { params: { limit: 100 } })
    const { events } = normalizeEventList(unwrap(response) || {})
    const byId = new Map(events.map((event) => [String(event._id), event]))

    return entries.map((entry) => {
      if (entry.title) return entry

      const match = byId.get(String(entry._id))
      if (!match) return entry

      return {
        ...match,
        registration: entry.registration,
        attended: entry.attended,
        registeredAt: entry.registeredAt,
        certificateIssued: entry.certificateIssued,
      }
    })
  } catch {
    return entries
  }
}

function normalizeCertificateList(data = {}) {
  const rawCertificates = Array.isArray(data)
    ? data
    : data.certificates || data.docs || data.results || []

  // Both certificate endpoints return certificate records, not registrations.
  // Keep the certificate ID even when its event reference is populated.
  return rawCertificates.map(normalizeCertificate).filter(Boolean)
}

function calendarFilenameFromDisposition(disposition = '', fallback) {
  const match = String(disposition).match(
    /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i
  )
  return match ? decodeURIComponent(match[1]) : fallback
}

const getApiMessage = (response, fallback) =>
  response?.data?.message || response?.data?.data?.message || fallback

async function changePasswordRequest(currentPassword, newPassword, confirmPassword) {
  // The API validates both a strong password and an explicit confirmation.
  const response = await api.post('/auth/change-password', {
    currentPassword,
    newPassword,
    newPasswordConfirm: confirmPassword ?? newPassword,
  })
  return { ...unwrap(response), message: getApiMessage(response) }
}

async function fetchUserCertificates(userId) {
  // The certificate module is the source of truth when available.
  if (userId) {
    try {
      const response = await api.get(`/certificates/user/${userId}`)
      return normalizeCertificateList(unwrap(response))
    } catch (error) {
      if (error.response?.status === 401) throw error
    }
  }

  const response = await api.get('/users/certificates')
  return normalizeCertificateList(unwrap(response))
}

export default {
  // ---------------------------------------------------------------- Auth
  auth: {
    signup: async (data) => {
      const response = await api.post('/auth/signup', data)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    login: async (data) => {
      const response = await api.post('/auth/login', data)
      return unwrap(response)
    },
    verifyOtp: async (email, otp) => {
      const response = await api.post('/auth/verify-otp', { email, otp })
      return unwrap(response)
    },
    resendOtp: async (email) => {
      const response = await api.post('/auth/resend-otp', { email })
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    forgotPassword: async (email) => {
      const response = await api.post('/auth/forgot-password', { email })
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    resetPassword: async (token, password) => {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword: password,
      })
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    changePassword: changePasswordRequest,
    me: async () => {
      const response = await api.get('/auth/me')
      return unwrap(response)?.user
    },
    logout: () => api.post('/auth/logout'),
  },

  // ---------------------------------------------------------------- User
  user: {
    getProfile: async () => {
      const response = await api.get('/users/profile')
      return unwrap(response)?.user
    },
    updateProfile: async (data) => {
      const response = await api.put('/users/profile', data)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    changePassword: (data) =>
      changePasswordRequest(
        data.currentPassword,
        data.newPassword,
        data.confirmPassword
      ),
    uploadProfilePicture: async (file) => {
      const formData = new FormData()
      formData.append('profileImage', file)

      const response = await api.post('/users/profile/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      return { ...unwrap(response), message: getApiMessage(response) }
    },
    deleteProfilePicture: () => api.delete('/users/profile/picture'),
    updatePreferences: async (data) => {
      const response = await api.put('/users/preferences', data)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    getRegisteredEvents: async (params = {}) => {
      const response = await api.get('/users/events/registered', { params })
      const data = unwrap(response) || {}
      const rawEvents = Array.isArray(data) ? data : data.events || []
      const entries = rawEvents.map(normalizeRegisteredEvent).filter(Boolean)
      return enrichRegisteredEvents(entries)
    },
    getEventStatus: async (eventId) => {
      const response = await api.get(`/users/events/${eventId}/status`)
      return unwrap(response)
    },
    getCertificates: fetchUserCertificates,
    getStatistics: async () => {
      const response = await api.get('/users/statistics')
      return unwrap(response)?.statistics || {}
    },
    deleteAccount: (password) => api.delete('/users/account', { data: { password } }),
  },

  // -------------------------------------------------------------- Events
  events: {
    getAll: async (params = {}) => {
      const response = await api.get('/events', { params })
      return normalizeEventList(unwrap(response) || {})
    },
    getById: async (id) => {
      const response = await api.get(`/events/${id}`)
      return normalizeEvent(unwrap(response)?.event)
    },
    register: async (id) => {
      const response = await api.post(`/users/events/${id}/register`)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    unregister: async (id) => {
      const response = await api.delete(`/users/events/${id}/register`)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    getMyEvents: async (params = {}) => {
      const response = await api.get('/users/events/registered', { params })
      const data = unwrap(response) || {}
      const rawEvents = Array.isArray(data) ? data : data.events || []
      const entries = rawEvents.map(normalizeRegisteredEvent).filter(Boolean)
      return enrichRegisteredEvents(entries)
    },
    getEventStatus: async (id) => {
      const response = await api.get(`/users/events/${id}/status`)
      return unwrap(response)
    },
    getQR: async (id) => {
      const response = await api.get(`/events/${id}/qr`)
      return unwrap(response)
    },
    getTicket: async (id) => {
      const response = await api.get(`/events/${id}/ticket`)
      return unwrap(response)
    },
  },

  // ----------------------------------------------------- Weekly programs
  weekly: {
    getWeek: async (weekStart) => {
      const response = await api.get('/weekly', {
        params: weekStart ? { weekStart } : {},
      })
      return unwrap(response) || {}
    },
    getCurrentWeek: async () => {
      const response = await api.get('/weekly/current')
      return unwrap(response) || {}
    },
    getActivity: async (id) => {
      const response = await api.get(`/weekly/activities/${id}`)
      return unwrap(response) || {}
    },
    downloadActivityCalendar: async (id) => {
      const response = await api.get(`/weekly/activities/${id}/calendar.ics`, {
        responseType: 'blob',
      })
      return {
        blob: response.data,
        filename: calendarFilenameFromDisposition(
          response.headers?.['content-disposition'],
          'citad-activity.ics'
        ),
      }
    },
    downloadWeekCalendar: async (weekStart) => {
      const response = await api.get('/weekly/calendar.ics', {
        params: weekStart ? { weekStart } : {},
        responseType: 'blob',
      })
      return {
        blob: response.data,
        filename: calendarFilenameFromDisposition(
          response.headers?.['content-disposition'],
          'citad-weekly.ics'
        ),
      }
    },
    getTasks: async (weekStart) => {
      const response = await api.get('/weekly/tasks', {
        params: weekStart ? { weekStart } : {},
      })
      return unwrap(response) || {}
    },
    createTask: async (payload) => {
      const response = await api.post('/weekly/tasks', payload)
      return unwrap(response)?.task || null
    },
    updateTask: async (id, payload) => {
      const response = await api.patch(`/weekly/tasks/${id}`, payload)
      return unwrap(response)?.task || null
    },
    deleteTask: async (id) => {
      const response = await api.delete(`/weekly/tasks/${id}`)
      return unwrap(response) || {}
    },
  },

  // -------------------------------------------------------- Certificates
  certificates: {
    getMyCertificates: (userId) => fetchUserCertificates(userId),
    download: async (id) => {
      const response = await api.get(`/certificates/${id}/download`, {
        responseType: 'blob',
      })

      const disposition = response.headers?.['content-disposition'] || ''
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)

      return {
        blob: response.data,
        filename: match ? decodeURIComponent(match[1]) : `certificate-${id}.pdf`,
      }
    },
    verify: async (hash) => {
      const response = await api.get(`/certificates/verify/${hash}`)
      return unwrap(response)
    },
  },

  // ------------------------------------------------------------ Feedback
  feedback: {
    submit: async (payload) => {
      const eventId = payload.eventId || payload.event
      const overall = payload.ratings?.overall ?? payload.rating?.overall ?? payload.rating

      // The v2 backend currently validates one payload shape and reads another.
      // Sending both shapes keeps the submission valid while the API is aligned.
      const body = {
        ...payload,
        eventId,
        event: eventId,
        ratings: { ...(payload.ratings || {}), overall },
        rating:
          payload.rating && typeof payload.rating === 'object'
            ? { ...payload.rating, overall }
            : { overall },
        booleanQuestions: {
          wouldRecommend:
            payload.wouldRecommend ??
            payload.booleanQuestions?.wouldRecommend ??
            true,
        },
        wouldRecommend:
          payload.wouldRecommend ??
          payload.booleanQuestions?.wouldRecommend ??
          true,
        content:
          payload.content ||
          payload.comments?.whatYouLiked ||
          payload.comments?.improvements ||
          '',
      }

      const response = await api.post('/feedback', body)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
  },

  // ------------------------------------------------------- Notifications
  notifications: {
    getAll: async (params = {}) => {
      const response = await api.get('/notifications', { params })
      return normalizeNotificationList(unwrap(response) || {})
    },
    getUnreadCount: async () => {
      const response = await api.get('/notifications/unread/count')
      return unwrap(response)?.count ?? 0
    },
    markAsRead: async (id) => {
      const response = await api.post(`/notifications/${id}/mark-read`)
      return unwrap(response)
    },
    markAllAsRead: async () => {
      const response = await api.post('/notifications/mark-all')
      return unwrap(response)
    },
    remove: (id) => api.delete(`/notifications/${id}`),
    removeAll: () => api.delete('/notifications'),
    getPreferences: async () => {
      const response = await api.get('/notifications/preferences')
      return unwrap(response)
    },
    updatePreferences: async (data) => {
      const response = await api.put('/notifications/preferences', data)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
  },
}

export { api }
