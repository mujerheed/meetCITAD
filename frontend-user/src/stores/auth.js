import { defineStore } from 'pinia'
import api from '@/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user,
  },

  actions: {
    async signup(userData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.auth.signup(userData)
        this.token = response.data.token
        this.user = response.data.user
        localStorage.setItem('token', this.token)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Signup failed'
        throw error
      } finally {
        this.loading = false
      }
    },

    async login(credentials) {
      this.loading = true
      this.error = null
      try {
        const response = await api.auth.login(credentials)
        this.token = response.data.token
        this.user = response.data.user
        localStorage.setItem('token', this.token)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Login failed'
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        await api.auth.logout()
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        this.user = null
        this.token = null
        localStorage.removeItem('token')
      }
    },

    async fetchProfile() {
      if (!this.token) return

      this.loading = true
      try {
        const response = await api.user.getProfile()
        this.user = response.data.user
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch profile'
        if (error.response?.status === 401) {
          this.logout()
        }
      } finally {
        this.loading = false
      }
    },

    async forgotPassword(email) {
      this.loading = true
      this.error = null
      try {
        const response = await api.auth.forgotPassword(email)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to send reset email'
        throw error
      } finally {
        this.loading = false
      }
    },

    async resetPassword(token, password) {
      this.loading = true
      this.error = null
      try {
        const response = await api.auth.resetPassword(token, password)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to reset password'
        throw error
      } finally {
        this.loading = false
      }
    },

    clearError() {
      this.error = null
    },
  },
})
