<template>
  <div class="certificates-page">
    <v-container class="py-8">
      <v-row class="mb-6">
        <v-col cols="12" md="8">
          <h1 class="text-h4 font-weight-bold mb-2">My Certificates</h1>
          <p class="text-body-1 text-medium-emphasis">
            Download or print the certificates issued for events you attended.
          </p>
        </v-col>
        <v-col cols="12" md="4" class="d-flex align-center justify-md-end ga-2">
          <v-chip v-if="hasCertificates" variant="tonal" color="primary">
            {{ certificates.length }} certificate{{ certificates.length === 1 ? '' : 's' }}
          </v-chip>
          <v-btn variant="text" color="primary" size="small" to="/verify" prepend-icon="mdi-shield-check-outline">
            Verify a certificate
          </v-btn>
        </v-col>
      </v-row>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-6"
        closable
        @click:close="certificateStore.clearError()"
      >
        {{ error }}
        <template #append>
          <v-btn variant="text" size="small" @click="loadCertificates">Retry</v-btn>
        </template>
      </v-alert>

      <!-- Loading -->
      <v-row v-if="loading">
        <v-col v-for="n in 3" :key="n" cols="12" md="6" lg="4">
          <v-skeleton-loader type="image, article, actions"></v-skeleton-loader>
        </v-col>
      </v-row>

      <!-- Certificates Grid -->
      <v-row v-else-if="hasCertificates">
        <v-col
          v-for="certificate in certificates"
          :key="certificate._id"
          cols="12"
          md="6"
          lg="4"
        >
          <v-card class="certificate-card h-100" elevation="1">
            <!-- Printable preview -->
            <div class="certificate-preview">
              <div class="preview-org">CITAD</div>
              <div class="preview-rule"></div>
              <div class="preview-heading">Certificate of Participation</div>
              <div class="preview-awarded">This certificate is awarded to</div>
              <div class="preview-name">
                {{ certificate.recipientName || authStore.currentUser?.fullname || 'Participant' }}
              </div>
              <div class="preview-awarded">for attending</div>
              <div class="preview-event">{{ certificate.title }}</div>
              <div class="preview-date">
                {{ formatDate(certificate.eventDate || certificate.issuedDate) }}
              </div>
              <v-icon class="preview-seal" size="32" color="accent">
                mdi-certificate-outline
              </v-icon>
            </div>

            <v-card-text class="pt-4">
              <div class="d-flex justify-space-between align-start ga-2 mb-2">
                <div class="text-caption text-medium-emphasis">
                  No. {{ certificate.certificateNumber || 'N/A' }}
                </div>
                <v-chip
                  size="x-small"
                  :color="statusColor(certificate.status)"
                  variant="tonal"
                >
                  {{ capitalize(certificate.status) }}
                </v-chip>
              </div>
              <div class="text-body-2">
                Issued {{ formatDate(certificate.issuedDate) }}
              </div>
            </v-card-text>

            <v-card-actions class="px-4 pb-4 flex-column align-stretch ga-2">
              <v-btn
                color="accent"
                variant="flat"
                elevation="0"
                block
                :loading="downloadingId === certificate._id"
                :disabled="certificate.status === 'revoked'"
                @click="download(certificate)"
              >
                <v-icon start>mdi-download</v-icon>
                Download PDF
              </v-btn>

              <v-btn
                color="primary"
                variant="outlined"
                block
                :disabled="certificate.status === 'revoked'"
                @click="preview(certificate)"
              >
                <v-icon start>mdi-printer-outline</v-icon>
                Print Preview
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-else class="my-12">
        <v-col cols="12" class="text-center">
          <v-icon size="80" color="grey-lighten-1" class="mb-4">
            mdi-certificate-outline
          </v-icon>
          <h3 class="text-h6 text-medium-emphasis mb-2">No certificates yet</h3>
          <p class="text-body-2 text-medium-emphasis mb-6">
            Certificates are issued after you attend an event and check in with
            your QR code.
          </p>
          <v-btn color="accent" variant="flat" elevation="0" to="/events">
            Browse Events
          </v-btn>
        </v-col>
      </v-row>
    </v-container>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { onMounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useCertificateStore } from '@/stores/certificate'
import { formatDate } from '@/utils/formatters'

const authStore = useAuthStore()
const certificateStore = useCertificateStore()

const { certificates, loading, downloadingId, error, hasCertificates } =
  storeToRefs(certificateStore)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success',
})

const capitalize = (value = '') =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : ''

const statusColor = (status) => {
  if (status === 'revoked') return 'error'
  if (status === 'expired') return 'warning'
  return 'success'
}

const showSnackbar = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

const loadCertificates = async () => {
  try {
    await certificateStore.fetchCertificates()
  } catch {
    // Error is displayed from the store.
  }
}

const download = async (certificate) => {
  try {
    await certificateStore.downloadCertificate(certificate)
    showSnackbar('Certificate downloaded.')
  } catch (err) {
    showSnackbar(
      err.response?.data?.message || 'Could not download the certificate.',
      'error'
    )
  }
}

const preview = async (certificate) => {
  try {
    await certificateStore.previewCertificate(certificate)
  } catch (err) {
    showSnackbar(
      err.response?.data?.message || 'Could not open the certificate.',
      'error'
    )
  }
}

onMounted(loadCertificates)
</script>

<style scoped>
.certificates-page {
  min-height: calc(100vh - 64px - 300px);
}

.certificate-card {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
}

.certificate-preview {
  position: relative;
  margin: 16px 16px 0;
  padding: 18px 16px;
  text-align: center;
  border: 1px solid rgba(15, 42, 68, 0.25);
  background: #fdfdfb;
  color: #0f2a44;
  min-height: 190px;
}

.preview-org {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.preview-rule {
  width: 40px;
  height: 2px;
  margin: 6px auto 10px;
  background: #c9a44c;
}

.preview-heading {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.preview-awarded {
  font-size: 0.6rem;
  color: #6b7280;
}

.preview-name {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-event {
  font-size: 0.72rem;
  font-weight: 600;
  margin: 2px 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-date {
  font-size: 0.62rem;
  color: #6b7280;
}

.preview-seal {
  position: absolute;
  right: 8px;
  bottom: 8px;
  opacity: 0.5;
}

.v-theme--dark .certificate-card {
  border-color: rgba(255, 255, 255, 0.08);
}

.v-theme--dark .certificate-preview {
  background: #f7f7f4;
}

.align-stretch {
  align-items: stretch;
}
</style>
