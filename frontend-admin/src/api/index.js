import axios from 'axios'
import { normalizeEvent } from '@/utils/normalizers'

/**
 * Axios client for the meetCITAD v2 admin API.
 *
 * Successful responses are wrapped as { success, message, data }, so helpers
 * unwrap the envelope before returning data to stores and views.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

const TOKEN_KEY = 'admin_token'
const REFRESH_KEY = 'admin_refresh_token'
const USER_KEY = 'admin_user'
const AUTH_PATHS = ['/login']

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
  if (response?.data?.error?.message) return response.data.error.message
  if (response?.data?.error) return response.data.error
  if (Array.isArray(response?.data?.errors) && response.data.errors.length) {
    return response.data.errors
      .map((item) => item.message || item.msg || item)
      .join(', ')
  }
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
  if (error?.message === 'Network Error') {
    return 'Unable to reach the server. Please check your connection.'
  }
  return error?.message || fallback
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

function redirectToLogin() {
  const currentPath = window.location.pathname
  if (AUTH_PATHS.some((path) => currentPath.startsWith(path))) return

  const redirect = encodeURIComponent(currentPath + window.location.search)
  window.location.assign(`/login?redirect=${redirect}`)
}

// Attach the admin access token to every request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

let refreshPromise = null

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) throw new Error('No refresh token')

  const response = await axios.post(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  )

  const data = unwrap(response)
  if (!data?.accessToken) throw new Error('Refresh failed')

  localStorage.setItem(TOKEN_KEY, data.accessToken)
  if (data.refreshToken) {
    localStorage.setItem(REFRESH_KEY, data.refreshToken)
  }

  return data.accessToken
}

// Refresh once on 401, otherwise clear the session and return to login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const originalRequest = error.config || {}
    const token = localStorage.getItem(TOKEN_KEY)
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    const isAuthRequest = /\/auth\/(admin\/login|admin\/2fa\/(setup|verify)|refresh|logout)/.test(
      originalRequest.url || ''
    )

    if (status === 401 && token && refreshToken && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true

      try {
        if (!refreshPromise) refreshPromise = refreshAccessToken()
        const accessToken = await refreshPromise
        refreshPromise = null

        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch {
        refreshPromise = null
        clearSession()
        redirectToLogin()
      }
    } else if (status === 401 && !isAuthRequest) {
      clearSession()
      redirectToLogin()
    }

    return Promise.reject(error)
  }
)

const getApiMessage = (response, fallback) =>
  response?.data?.message || response?.data?.data?.message || fallback

function normalizeEventList(data = {}) {
  const rawEvents = Array.isArray(data)
    ? data
    : data.events || data.docs || data.results || []

  const events = rawEvents.map(normalizeEvent)
  const rawPagination = data.pagination || data
  const total = rawPagination.totalDocs ?? rawPagination.total ?? data.total ?? events.length
  const limit = rawPagination.limit ?? data.limit ?? 20
  const page = rawPagination.page ?? data.page ?? 1

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

export default {
  // ---------------------------------------------------------------- Auth
  auth: {
    adminLogin: async (data) => {
      const response = await api.post('/auth/admin/login', data)
      return unwrap(response)
    },
    setupTwoFactor: async (setupToken) => {
      const response = await api.post('/auth/admin/2fa/setup', { setupToken })
      return unwrap(response)
    },
    verifyTwoFactorSetup: async (setupToken, code) => {
      const response = await api.post('/auth/admin/2fa/verify', {
        setupToken,
        code,
      })
      return unwrap(response)
    },
    regenerateRecoveryCodes: async (password, code) => {
      const response = await api.post('/auth/admin/2fa/recovery-codes', {
        password,
        code,
      })
      return unwrap(response)
    },
    me: async () => {
      const response = await api.get('/auth/me')
      return unwrap(response)
    },
    logout: async () => {
      const response = await api.post('/auth/logout')
      return unwrap(response)
    },
    changePassword: async (currentPassword, newPassword) => {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        newPasswordConfirm: newPassword,
      })
      return { ...unwrap(response), message: getApiMessage(response) }
    },
  },

  // --------------------------------------------------------------- Admin
  admin: {
    dashboard: async () => {
      const response = await api.get('/admin/dashboard')
      return unwrap(response)?.statistics || {}
    },
    analytics: async (params = {}) => {
      const response = await api.get('/admin/analytics', { params })
      return unwrap(response)?.analytics || {}
    },
    users: async (params = {}) => {
      const response = await api.get('/admin/users', { params })
      const data = unwrap(response) || {}
      return {
        users: data.users || [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        totalPages: data.totalPages ?? 1,
      }
    },
    user: async (id) => {
      const response = await api.get(`/admin/users/${id}`)
      return unwrap(response)?.user || null
    },
    updateUserStatus: async (id, status) => {
      const response = await api.put(`/admin/users/${id}/status`, { status })
      return unwrap(response)?.user || null
    },
    deleteUser: async (id) => {
      const response = await api.delete(`/admin/users/${id}`)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    audit: async (params = {}) => {
      const response = await api.get('/admin/audit', { params })
      const data = unwrap(response) || {}
      return {
        logs: data.logs || [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        totalPages: data.totalPages ?? 1,
      }
    },
    health: async () => {
      const response = await api.get('/admin/health')
      return unwrap(response)?.health || null
    },
    exportData: async (type, format = 'json') => {
      const response = await api.get(`/admin/export/${type}`, {
        params: { format },
      })
      return unwrap(response) || {}
    },
    admins: async (params = {}) => {
      const response = await api.get('/admin', { params })
      const data = unwrap(response) || {}
      return {
        admins: data.admins || [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        totalPages: data.totalPages ?? 1,
      }
    },
    admin: async (id) => {
      const response = await api.get(`/admin/${id}`)
      return unwrap(response)?.admin || null
    },
    createAdmin: async (data) => {
      const response = await api.post('/admin', data)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    updateAdmin: async (id, data) => {
      const response = await api.put(`/admin/${id}`, data)
      return unwrap(response)?.admin || null
    },
    deleteAdmin: async (id) => {
      const response = await api.delete(`/admin/${id}`)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
  },

  // -------------------------------------------------------------- Events
  events: {
    list: async (params = {}) => {
      const response = await api.get('/events', { params })
      return normalizeEventList(unwrap(response) || {})
    },
    get: async (id) => {
      const response = await api.get(`/events/${id}`)
      return normalizeEvent(unwrap(response)?.event)
    },
    create: async (data) => {
      const response = await api.post('/events', data)
      return normalizeEvent(unwrap(response)?.event)
    },
    update: async (id, data) => {
      const response = await api.put(`/events/${id}`, data)
      return normalizeEvent(unwrap(response)?.event)
    },
    remove: async (id) => {
      const response = await api.delete(`/events/${id}`)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    publish: async (id) => {
      const response = await api.post(`/events/${id}/publish`)
      return normalizeEvent(unwrap(response)?.event)
    },
    cancel: async (id, reason) => {
      const response = await api.post(`/events/${id}/cancel`, { reason })
      return normalizeEvent(unwrap(response)?.event)
    },
    statistics: async (id) => {
      const response = await api.get(`/events/${id}/statistics`)
      return unwrap(response)?.statistics || {}
    },
    attendees: async (id, params = {}) => {
      const response = await api.get(`/events/${id}/attendees`, { params })
      const data = unwrap(response) || {}
      return {
        attendees: data.attendees || [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        totalPages: data.totalPages ?? 1,
      }
    },
    qr: async (id) => {
      const response = await api.get(`/events/${id}/qr`)
      return unwrap(response) || {}
    },
    uploadBanner: async (id, file) => {
      const formData = new FormData()
      formData.append('bannerImage', file)
      const response = await api.post(`/events/${id}/banner`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return unwrap(response)?.event || null
    },
    uploadGallery: async (id, files) => {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append('gallery', file))
      const response = await api.post(`/events/${id}/gallery`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return unwrap(response)?.event || null
    },
    deleteGalleryImage: async (id, index) => {
      const response = await api.delete(`/events/${id}/gallery/${index}`)
      return unwrap(response)?.event || null
    },
  },

  // ---------------------------------------------------------- Attendance
  attendance: {
    scan: async (qrData) => {
      const response = await api.post('/attendance/scan', { qrData })
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    manualCheckIn: async (eventId, userId) => {
      const response = await api.post('/attendance/manual-checkin', {
        eventId,
        userId,
      })
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    bulkCheckIn: async (eventId, userIds) => {
      const response = await api.post('/attendance/bulk-checkin', {
        eventId,
        userIds,
      })
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    undoCheckIn: async (eventId, userId) => {
      const response = await api.post('/attendance/undo-checkin', {
        eventId,
        userId,
      })
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    report: async (eventId) => {
      const response = await api.get(`/attendance/report/${eventId}`)
      const data = unwrap(response) || {}
      return {
        summary: data.summary || {},
        attendees: data.attendees || [],
      }
    },
    search: async (eventId, query) => {
      const response = await api.get('/attendance/search', {
        params: { eventId, query },
      })
      return unwrap(response)?.results || []
    },
    live: async (eventId) => {
      const response = await api.get(`/attendance/live/${eventId}`)
      return unwrap(response)?.stats || {}
    },
  },

  // ---------------------------------------------------------- Certificates
  certificates: {
    list: async (params = {}) => {
      const response = await api.get('/certificates', { params })
      const data = unwrap(response) || {}
      return {
        certificates: data.certificates || [],
        pagination: data.pagination || {
          page: 1,
          limit: params.limit || 20,
          total: data.certificates?.length || 0,
          totalPages: 1,
        },
      }
    },
    statistics: async (params = {}) => {
      const response = await api.get('/certificates/statistics', { params })
      return unwrap(response)?.statistics || {}
    },
    templates: async (params = {}) => {
      const response = await api.get('/certificates/templates', { params })
      return unwrap(response)?.templates || []
    },
    userCertificates: async (userId) => {
      const response = await api.get(`/certificates/user/${userId}`)
      return unwrap(response)?.certificates || []
    },
    template: async (id) => {
      const response = await api.get(`/certificates/templates/${id}`)
      return unwrap(response)?.template || null
    },
    createTemplate: async (data) => {
      const response = await api.post('/certificates/templates', data)
      return unwrap(response)?.template || null
    },
    updateTemplate: async (id, data) => {
      const response = await api.put(`/certificates/templates/${id}`, data)
      return unwrap(response)?.template || null
    },
    deleteTemplate: async (id) => {
      const response = await api.delete(`/certificates/templates/${id}`)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    generate: async (data) => {
      const response = await api.post('/certificates/generate', data)
      return unwrap(response)?.certificate || null
    },
    bulkGenerate: async (eventId, templateId) => {
      const response = await api.post('/certificates/bulk-generate', {
        eventId,
        templateId,
      })
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    download: async (id) => {
      const response = await api.get(`/certificates/${id}/download`, {
        responseType: 'blob',
      })
      return response
    },
    revoke: async (id, reason) => {
      const response = await api.post(`/certificates/${id}/revoke`, { reason })
      return unwrap(response)?.certificate || null
    },
    regenerate: async (id, templateId) => {
      const response = await api.post(`/certificates/${id}/regenerate`, {
        templateId,
      })
      return unwrap(response)?.certificate || null
    },
  },

  // -------------------------------------------------------------- Feedback
  feedback: {
    list: async (params = {}) => {
      const response = await api.get('/feedback', { params })
      const data = unwrap(response) || {}
      return {
        feedback: data.feedback || [],
        pagination: data.pagination || {
          page: 1,
          limit: params.limit || 20,
          total: data.feedback?.length || 0,
          totalPages: 1,
        },
      }
    },
    analytics: async (eventId) => {
      const data = unwrap(await api.get(`/feedback/analytics/${eventId}`)) || {}
      return data.analytics || data
    },
    respond: async (id, message) => {
      const response = await api.post(`/feedback/${id}/respond`, { message })
      return unwrap(response)?.feedback || null
    },
    flag: async (id, reason) => {
      const response = await api.post(`/feedback/${id}/flag`, { reason })
      return unwrap(response)?.feedback || null
    },
    remove: async (id) => {
      const response = await api.delete(`/feedback/${id}`)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    export: async (eventId) => {
      const response = await api.get(`/feedback/export/${eventId}`)
      return unwrap(response) || {}
    },
  },

  // ---------------------------------------------------------- Notifications
  notifications: {
    statistics: async (params = {}) => {
      const response = await api.get('/notifications/statistics', { params })
      return unwrap(response)?.statistics || {}
    },
    broadcast: async (data) => {
      const response = await api.post('/notifications/broadcast', data)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    sendEvent: async (eventId, data) => {
      const response = await api.post(`/notifications/event/${eventId}`, data)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    sendReminder: async (eventId) => {
      const response = await api.post(`/notifications/reminder/${eventId}`)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    test: async (data) => {
      const response = await api.post('/notifications/test', data)
      return { ...unwrap(response), message: getApiMessage(response) }
    },
    cleanup: async () => {
      const response = await api.post('/notifications/cleanup')
      return { ...unwrap(response), message: getApiMessage(response) }
    },
  },
}

export { TOKEN_KEY, REFRESH_KEY, USER_KEY }
