import { defineStore } from 'pinia'
import api, { getErrorMessage } from '@/api'
import { normalizeUser, resolveMediaUrl } from '@/utils/normalizers'
import { cacheClear } from '@/utils/offline'

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? normalizeUser(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function parseName(fullname = '') {
  const parts = String(fullname).trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: readStoredUser(),
    token: localStorage.getItem('token') || null,
    pendingEmail: localStorage.getItem('pendingEmail') || null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    currentUser: (state) => state.user,
    displayName: (state) => state.user?.name || state.user?.fullname || 'Account',
    userInitials: (state) => {
      const name = state.user?.name || state.user?.fullname || ''
      return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
    },
  },

  actions: {
    setSession(payload = {}) {
      const token = payload.accessToken || payload.token
      const user = normalizeUser(payload.user)

      if (token) {
        this.token = token
        localStorage.setItem('token', token)
      }

      if (user) {
        this.user = user
        localStorage.setItem('user', JSON.stringify(user))
      }

      this.pendingEmail = null
      localStorage.removeItem('pendingEmail')
    },

    clearSession() {
      this.user = null
      this.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      // Remove participant-specific offline caches so a shared device does not
      // keep another person's events or ticket QR after sign-out.
      cacheClear()
    },

    async signup(userData) {
      this.loading = true
      this.error = null

      try {
        const { firstName, lastName, fullname: providedName, ...rest } = userData
        const fullname =
          providedName ||
          [firstName, lastName].filter(Boolean).join(' ').trim()

        // Send both naming conventions so the form works with either the
        // first/last-name or full-name schema used by the API.
        const response = await api.auth.signup({
          ...rest,
          fullname,
          firstName,
          lastName,
          passwordConfirm: userData.passwordConfirm || rest.confirmPassword || rest.password,
        })

        this.pendingEmail = response?.email || userData.email
        if (this.pendingEmail) {
          localStorage.setItem('pendingEmail', this.pendingEmail)
        }

        return response
      } catch (error) {
        this.error = getErrorMessage(error, 'Signup failed. Please try again.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async verifyOtp(email, otp) {
      this.loading = true
      this.error = null

      try {
        const response = await api.auth.verifyOtp(email, otp)
        this.setSession(response)
        return response
      } catch (error) {
        this.error = getErrorMessage(error, 'Verification failed. Please try again.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async resendOtp(email) {
      this.loading = true
      this.error = null

      try {
        return await api.auth.resendOtp(email)
      } catch (error) {
        this.error = getErrorMessage(error, 'Could not resend the code.')
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
        this.setSession(response)
        return response
      } catch (error) {
        this.error = getErrorMessage(error, 'Login failed. Please check your details.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        if (this.token) await api.auth.logout()
      } catch (error) {
        // The local session is cleared regardless of the server response.
        console.error('Logout error:', error)
      } finally {
        this.clearSession()
      }
    },

    async fetchProfile() {
      if (!this.token) return null

      this.loading = true
      try {
        const user = await api.user.getProfile()
        this.user = normalizeUser(user)
        if (this.user) {
          localStorage.setItem('user', JSON.stringify(this.user))
        }
        return this.user
      } catch (error) {
        if (error.response?.status === 401) {
          this.clearSession()
        }
        this.error = getErrorMessage(error, 'Failed to load your profile.')
        return null
      } finally {
        this.loading = false
      }
    },

    async updateProfile(data) {
      this.loading = true
      this.error = null

      try {
        const fullname =
          data.fullname ||
          [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
        const nameParts = parseName(fullname)

        const payload = {
          ...data,
          fullname,
          firstName: data.firstName || nameParts.firstName,
          lastName: data.lastName || nameParts.lastName,
          organisation: data.organisation || data.organization || '',
          organization: data.organization || data.organisation || '',
          biography: data.biography || data.bio || '',
          bio: data.bio || data.biography || '',
        }

        const response = await api.user.updateProfile(payload)

        // Prefer the server copy, but fall back to the submitted values.
        this.user = normalizeUser(response?.user || { ...this.user, ...payload })
        localStorage.setItem('user', JSON.stringify(this.user))

        return { ...response, user: this.user }
      } catch (error) {
        this.error = getErrorMessage(error, 'Could not update your profile.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async uploadProfilePicture(file) {
      this.loading = true
      this.error = null

      try {
        const response = await api.user.uploadProfilePicture(file)
        const profilePicture =
          response?.profilePicture ||
          response?.user?.profilePicture ||
          response?.user?.profileImage

        if (profilePicture && this.user) {
          this.user.profilePicture = resolveMediaUrl(profilePicture)
          this.user.profileImage = profilePicture
          localStorage.setItem('user', JSON.stringify(this.user))
        } else {
          await this.fetchProfile()
        }

        return response
      } catch (error) {
        this.error = getErrorMessage(error, 'Could not upload your picture.')
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
          data.newPassword,
          data.confirmPassword
        )
        // The API revokes the current token after a password change.
        this.clearSession()
        return result
      } catch (error) {
        this.error = getErrorMessage(error, 'Could not change your password.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async updatePreferences(preferences) {
      this.loading = true
      this.error = null

      try {
        const response = await api.user.updatePreferences(preferences)
        if (this.user) {
          this.user.preferences = {
            ...this.user.preferences,
            ...preferences,
          }
          localStorage.setItem('user', JSON.stringify(this.user))
        }
        return response
      } catch (error) {
        this.error = getErrorMessage(error, 'Could not save your preferences.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async forgotPassword(email) {
      this.loading = true
      this.error = null

      try {
        return await api.auth.forgotPassword(email)
      } catch (error) {
        this.error = getErrorMessage(error, 'Failed to send the reset email.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async resetPassword(token, password) {
      this.loading = true
      this.error = null

      try {
        return await api.auth.resetPassword(token, password)
      } catch (error) {
        this.error = getErrorMessage(error, 'Failed to reset your password.')
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
