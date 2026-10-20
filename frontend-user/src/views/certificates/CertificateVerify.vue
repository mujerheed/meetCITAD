<template>
  <div class="verify-page">
    <v-container class="py-10" max-width="760">
      <div class="text-center mb-8">
        <div class="verify-org">CITAD</div>
        <h1 class="text-h5 font-weight-bold mt-2 mb-1">Certificate Verification</h1>
        <p class="text-body-2 text-medium-emphasis">
          Confirm that a meetCITAD certificate was issued by the Centre for
          Information Technology and Development.
        </p>
      </div>

      <!-- Loading -->
      <v-card v-if="loading" class="pa-12 text-center" elevation="1">
        <v-progress-circular indeterminate color="primary" size="56"></v-progress-circular>
        <p class="text-body-2 text-medium-emphasis mt-4">Verifying certificate...</p>
      </v-card>

      <!-- Verified -->
      <v-card v-else-if="result?.valid" class="verify-card" elevation="1">
        <v-card-text class="pa-8">
          <div class="text-center mb-6">
            <v-icon size="72" color="success" class="mb-3">mdi-shield-check-outline</v-icon>
            <h2 class="text-h5 font-weight-bold mb-1">Certificate Verified</h2>
            <p class="text-body-2 text-medium-emphasis">
              {{ result.message || 'This certificate is valid and was issued by CITAD.' }}
            </p>
          </div>

          <v-divider class="mb-6"></v-divider>

          <v-row dense>
            <v-col cols="12" sm="6">
              <div class="detail-label">Certificate Number</div>
              <div class="detail-value">{{ certificate.certificateNumber || '—' }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="detail-label">Status</div>
              <div class="detail-value">
                <v-chip color="success" variant="tonal" size="small">
                  {{ capitalize(certificate.status || 'active') }}
                </v-chip>
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="detail-label">Recipient</div>
              <div class="detail-value">{{ certificate.recipientName || '—' }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="detail-label">Event</div>
              <div class="detail-value">{{ certificate.eventTitle || '—' }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="detail-label">Event Date</div>
              <div class="detail-value">{{ formatDate(certificate.eventDate) || '—' }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="detail-label">Issued</div>
              <div class="detail-value">{{ formatDate(certificate.issuedDate) || '—' }}</div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Invalid -->
      <v-card v-else-if="hasHash" class="verify-card" elevation="1">
        <v-card-text class="pa-8 text-center">
          <v-icon size="72" color="warning" class="mb-3">mdi-shield-alert-outline</v-icon>
          <h2 class="text-h6 font-weight-bold mb-2">Certificate Not Verified</h2>
          <p class="text-body-2 text-medium-emphasis mb-2">
            {{ errorMessage || result?.message || 'We could not verify this certificate.' }}
          </p>
          <p class="text-caption text-medium-emphasis mb-6">
            If you believe this is an error, please contact CITAD at info@citad.org.
          </p>
          <v-btn color="primary" variant="outlined" to="/">
            Return to meetCITAD
          </v-btn>
        </v-card-text>
      </v-card>

      <!-- Awaiting a code -->
      <v-card v-else class="verify-card" elevation="1">
        <v-card-text class="pa-10 text-center">
          <v-icon size="64" color="primary" class="mb-3">mdi-qrcode-scan</v-icon>
          <h2 class="text-h6 font-weight-bold mb-2">Enter a verification code</h2>
          <p class="text-body-2 text-medium-emphasis">
            Scan the QR code on a CITAD certificate, or enter the verification
            code below to confirm its authenticity.
          </p>
        </v-card-text>
      </v-card>

      <!-- Verify another -->
      <v-card class="mt-6" elevation="1">
        <v-card-text class="pa-6">
          <div class="text-body-2 font-weight-medium mb-3">
            Verify another certificate
          </div>
          <div class="d-flex flex-column flex-sm-row ga-3">
            <v-text-field
              v-model="lookupHash"
              label="Verification link or code"
              placeholder="Paste the certificate link or the 64-character verification code"
              variant="outlined"
              density="comfortable"
              hide-details
              class="flex-grow-1"
              @keyup.enter="verifyAnother"
            ></v-text-field>
            <v-btn
              color="primary"
              variant="flat"
              height="48"
              :disabled="!lookupHash.trim()"
              @click="verifyAnother"
            >
              Verify
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <div class="text-center mt-8">
        <p class="text-caption text-medium-emphasis">
          Centre for Information Technology and Development (CITAD), Kano
        </p>
      </div>
    </v-container>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { getErrorMessage } from '@/api'
import { formatDate } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const result = ref(null)
const errorMessage = ref(null)
const lookupHash = ref('')

const certificate = computed(() => result.value?.certificate || {})
const hasHash = computed(() => Boolean(route.params.hash))

const capitalize = (value = '') =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : ''

const verify = async (hash) => {
  if (!hash) {
    loading.value = false
    errorMessage.value = 'No verification code was provided.'
    return
  }

  loading.value = true
  result.value = null
  errorMessage.value = null

  try {
    result.value = await api.certificates.verify(hash)
    if (!result.value?.valid) {
      errorMessage.value = result.value?.message || 'Certificate is not valid.'
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(
      error,
      'We could not verify this certificate.'
    )
  } finally {
    loading.value = false
  }
}

const verifyAnother = () => {
  const raw = lookupHash.value.trim()
  if (!raw) return

  // Accept either a full verification URL or the raw code.
  const fromUrl = raw.match(/\/verify\/([^/?#]+)/)
  const hash = fromUrl ? decodeURIComponent(fromUrl[1]) : raw

  router.push(`/verify/${encodeURIComponent(hash)}`)
}

watch(
  () => route.params.hash,
  (hash) => {
    if (hash) verify(String(hash))
  }
)

onMounted(() => {
  verify(String(route.params.hash || ''))
})
</script>

<style scoped>
.verify-page {
  min-height: calc(100vh - 64px - 300px);
}

.verify-org {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: rgb(var(--v-theme-primary));
}

.verify-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.detail-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 4px;
}

.detail-value {
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 18px;
  word-break: break-word;
}

.v-theme--dark .verify-card {
  border-color: rgba(255, 255, 255, 0.08);
}
</style>
