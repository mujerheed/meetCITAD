import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const authStore = useAuthStore()
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      authStore.logout()
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

export default {
  // Auth
  auth: {
    signup: (data) => api.post('/auth/signup', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
    verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  },

  // User
  user: {
    getProfile: () => api.get('/user/profile'),
    updateProfile: (data) => api.put('/user/profile', data),
    changePassword: (data) => api.put('/user/change-password', data),
    uploadProfilePicture: (formData) => api.post('/user/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  },

  // Events
  events: {
    getAll: (params) => api.get('/events', { params }),
    getById: (id) => api.get(`/events/${id}`),
    register: (id) => api.post(`/events/${id}/register`),
    unregister: (id) => api.post(`/events/${id}/unregister`),
    getMyEvents: () => api.get('/user/events'),
    checkIn: (id, code) => api.post(`/events/${id}/checkin`, { code }),
  },

  // Certificates
  certificates: {
    getMyCertificates: () => api.get('/user/certificates'),
    download: (id) => api.get(`/user/certificates/${id}/download`, {
      responseType: 'blob'
    }),
  },

  // Feedback
  feedback: {
    submit: (eventId, data) => api.post(`/events/${eventId}/feedback`, data),
    getMyFeedback: (eventId) => api.get(`/events/${eventId}/feedback/my`),
  },

  // Notifications
  notifications: {
    getAll: (params) => api.get('/user/notifications', { params }),
    markAsRead: (id) => api.put(`/user/notifications/${id}/read`),
    markAllAsRead: () => api.put('/user/notifications/read-all'),
  },
}
