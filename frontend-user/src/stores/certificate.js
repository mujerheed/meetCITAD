import { defineStore } from 'pinia'
import api, { getErrorMessage } from '@/api'
import { useAuthStore } from '@/stores/auth'

function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const useCertificateStore = defineStore('certificate', {
  state: () => ({
    certificates: [],
    loading: false,
    downloadingId: null,
    error: null,
  }),

  getters: {
    activeCertificates: (state) =>
      state.certificates.filter((certificate) => certificate.status === 'active'),
    hasCertificates: (state) => state.certificates.length > 0,
  },

  actions: {
    async fetchCertificates() {
      const authStore = useAuthStore()
      this.loading = true
      this.error = null

      try {
        const user = authStore.currentUser || (await authStore.fetchProfile())
        this.certificates = await api.certificates.getMyCertificates(user?._id)
        return this.certificates
      } catch (error) {
        this.error = getErrorMessage(error, 'Failed to load your certificates.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async downloadCertificate(certificate) {
      if (!certificate?._id) return

      this.downloadingId = certificate._id
      this.error = null

      try {
        const { blob, filename } = await api.certificates.download(certificate._id)
        triggerBrowserDownload(blob, filename)
      } catch (error) {
        this.error = getErrorMessage(error, 'Could not download the certificate.')
        throw error
      } finally {
        this.downloadingId = null
      }
    },

    async previewCertificate(certificate) {
      if (!certificate) return

      this.error = null

      try {
        const { blob } = await api.certificates.download(certificate._id)
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener')
        window.setTimeout(() => URL.revokeObjectURL(url), 60000)
      } catch (error) {
        this.error = getErrorMessage(error, 'Could not open the certificate.')
        throw error
      }
    },

    clearError() {
      this.error = null
    },
  },
})
