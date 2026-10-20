import { defineStore } from 'pinia'
import api, {
  getErrorMessage,
  TOKEN_KEY,
  REFRESH_KEY,
  USER_KEY,
} from '@/api'
import { normalizeUser } from '@/utils/normalizers'

function readStoredAdmin() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    admin: readStoredAdmin(),
    token: localStorage.getItem(TOKEN_KEY) || null,
    refreshToken: localStorage.getItem(REFRESH_KEY) || null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    currentAdmin: (state) => state.admin,
    displayName: (state) => state.admin?.fullname || state.admin?.email || 'Administrator',
    initials: (state) => {
      const name = state.admin?.fullname || state.admin?.email || ''
      return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
    },
    roleLabel: (state) => {
      const labels = {
        super_admin: 'Super Administrator',
        event_manager: 'Event Manager',
        staff: 'Staff',
        auditor: 'Auditor',
      }
      return labels[state.admin?.role] || 'Administrator'
    },
    isSuperAdmin: (state) => state.admin?.role === 'super_admin',
    can: (state) => (permission) => {
      if (!state.admin) return false
      if (state.admin.role === 'super_admin') return true
      return (state.admin.permissions || []).includes(permission)
    },
  },

  actions: {
    setSession(payload = {}) {
      const admin = payload.admin || payload.user
      const accessToken = payload.accessToken || payload.token

      if (admin) {
        this.admin = normalizeUser(admin)
        localStorage.setItem(USER_KEY, JSON.stringify(this.admin))
      }

      if (accessToken) {
        this.token = accessToken
        localStorage.setItem(TOKEN_KEY, accessToken)
      }

      if (payload.refreshToken) {
        this.refreshToken = payload.refreshToken
        localStorage.setItem(REFRESH_KEY, payload.refreshToken)
      }
    },

    clearSession() {
      this.admin = null
      this.token = null
      this.refreshToken = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_KEY)
      localStorage.removeItem(USER_KEY)
    },

    async login(credentials) {
      this.loading = true
      this.error = null

      try {
        const response = await api.auth.adminLogin(credentials)
        if (response?.requiresTwoFactorSetup) {
          return response
        }
        this.setSession(response)
        return response
      } catch (error) {
        this.error = getErrorMessage(error, 'Login failed. Please check your details.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async beginTwoFactorSetup(setupToken) {
      this.loading = true
      this.error = null

      try {
        return await api.auth.setupTwoFactor(setupToken)
      } catch (error) {
        this.error = getErrorMessage(
          error,
          'Could not start two-factor authentication setup.'
        )
        throw error
      } finally {
        this.loading = false
      }
    },

    async completeTwoFactorSetup(setupToken, code) {
      this.loading = true
      this.error = null

      try {
        const response = await api.auth.verifyTwoFactorSetup(setupToken, code)
        this.setSession(response)
        return response
      } catch (error) {
        this.error = getErrorMessage(
          error,
          'Could not verify the authentication code.'
        )
        throw error
      } finally {
        this.loading = false
      }
    },

    async regenerateRecoveryCodes(password, code) {
      this.loading = true
      this.error = null

      try {
        return await api.auth.regenerateRecoveryCodes(password, code)
      } catch (error) {
        this.error = getErrorMessage(
          error,
          'Could not regenerate recovery codes.'
        )
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchProfile() {
      if (!this.token) return null

      try {
        const response = await api.auth.me()
        if (response?.role && response.role !== 'admin') {
          this.clearSession()
          return null
        }

        this.admin = normalizeUser(response?.user)
        localStorage.setItem(USER_KEY, JSON.stringify(this.admin))
        return this.admin
      } catch (error) {
        if (error.response?.status === 401) this.clearSession()
        return null
      }
    },

    async updateProfile(data) {
      if (!this.admin?.id && !this.admin?._id) return null

      this.loading = true
      this.error = null

      try {
        const id = this.admin.id || this.admin._id
        const updated = await api.admin.updateAdmin(id, data)
        const merged = normalizeUser({ ...this.admin, ...(updated || data) })
        this.admin = merged
        localStorage.setItem(USER_KEY, JSON.stringify(merged))
        return merged
      } catch (error) {
        this.error = getErrorMessage(error, 'Could not update your profile.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async changePassword(data) {
      this.loading = true
      this.error = null

      try {
        const result = await api.auth.changePassword(
          data.currentPassword,
          data.newPassword
        )
        // The API revokes all tokens after a password change.
        this.clearSession()
        return result
      } catch (error) {
        this.error = getErrorMessage(error, 'Could not change your password.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        if (this.token) await api.auth.logout()
      } catch {
        // Local state is always cleared.
      } finally {
        this.clearSession()
      }
    },

    clearError() {
      this.error = null
    },
  },
})
