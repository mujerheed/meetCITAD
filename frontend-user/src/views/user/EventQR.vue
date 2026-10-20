<template>
  <div class="qr-page">
    <v-container class="py-8" max-width="800">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-4" to="/my-events">
        Back to My Events
      </v-btn>

      <v-alert
        v-if="offline"
        type="info"
        variant="tonal"
        class="mb-6"
        icon="mdi-wifi-off"
      >
        You are offline. This is your last saved ticket — keep this screen open
        or save the QR image before the event.
      </v-alert>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-6"
        closable
        @click:close="error = null"
      >
        {{ error }}
      </v-alert>

      <v-card v-if="loading" class="pa-12 text-center" elevation="1">
        <v-progress-circular indeterminate color="primary" size="56"></v-progress-circular>
        <p class="text-body-2 text-medium-emphasis mt-4">Preparing your check-in code...</p>
      </v-card>

      <v-card v-else-if="event" class="qr-card" elevation="1">
        <v-card-text class="text-center pa-8">
          <div class="text-caption text-medium-emphasis mb-1">CITAD Event Ticket</div>
          <h1 class="text-h5 font-weight-bold mb-2">{{ event.title }}</h1>
          <p class="text-body-2 text-medium-emphasis mb-6">
            {{ formatDate(event.startDate) }} &middot; {{ formatTime(event.startTime) }}
            &middot; {{ event.location }}
          </p>

          <div class="qr-frame mx-auto mb-6">
            <v-img
              v-if="qrCode"
              :src="qrCode"
              width="300"
              height="300"
              alt="Personal event ticket QR code"
              contain
            ></v-img>
            <div v-else class="qr-placeholder">
              <v-icon size="48" color="grey-lighten-1">mdi-qrcode-remove</v-icon>
              <p class="text-caption text-medium-emphasis mt-2">
                QR code unavailable
              </p>
            </div>
          </div>

          <p class="text-body-2 text-medium-emphasis mb-1">
            Present this code at the event entrance to record your attendance.
          </p>
          <p class="text-caption text-medium-emphasis mb-6">
            Registration: {{ authStore.currentUser?.email }}
          </p>

          <div class="d-flex flex-column flex-sm-row justify-center ga-3">
            <v-btn
              color="accent"
              variant="flat"
              elevation="0"
              :disabled="!qrCode"
              @click="downloadQR"
            >
              <v-icon start>mdi-download</v-icon>
              Save QR Code
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              :disabled="!qrCode"
              @click="printQR"
            >
              <v-icon start>mdi-printer-outline</v-icon>
              Print
            </v-btn>
            <v-btn color="primary" variant="text" :to="`/events/${event._id}`">
              Event Details
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <v-card v-else class="pa-12 text-center" elevation="1">
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-calendar-remove</v-icon>
        <h2 class="text-h6 mb-2">Event not found</h2>
        <p class="text-body-2 text-medium-emphasis mb-6">
          We could not load the event for this check-in code.
        </p>
        <v-btn color="primary" variant="outlined" to="/my-events">My Events</v-btn>
      </v-card>
    </v-container>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api, { getErrorMessage } from '@/api'
import { normalizeEvent } from '@/utils/normalizers'
import { formatDate, formatTime } from '@/utils/formatters'
import { cacheGet, cacheSet } from '@/utils/offline'

const route = useRoute()
const authStore = useAuthStore()

const event = ref(null)
const qrCode = ref('')
const loading = ref(true)
const error = ref(null)
const offline = ref(false)

const cacheKey = `ticket:${route.params.id}`

const restoreCachedTicket = () => {
  const cached = cacheGet(cacheKey, 24 * 60 * 60 * 1000)
  if (!cached?.value?.qrCode) return false

  event.value = cached.value.event || null
  qrCode.value = cached.value.qrCode
  offline.value = true
  return true
}

const load = async () => {
  loading.value = true
  error.value = null
  offline.value = false

  try {
    const [eventResponse, ticketResponse] = await Promise.allSettled([
      api.events.getById(route.params.id),
      api.events.getTicket(route.params.id),
    ])

    if (eventResponse.status === 'fulfilled') {
      event.value = normalizeEvent(eventResponse.value)
    }

    if (ticketResponse.status === 'fulfilled') {
      qrCode.value = ticketResponse.value?.qrCode || ''
    }

    if (event.value && qrCode.value) {
      cacheSet(cacheKey, { event: event.value, qrCode: qrCode.value })
    }

    if (eventResponse.status === 'rejected' && ticketResponse.status === 'rejected') {
      if (!restoreCachedTicket()) {
        error.value = getErrorMessage(
          eventResponse.reason,
          'Could not load the check-in code.'
        )
      }
    } else if (ticketResponse.status === 'rejected' && !qrCode.value) {
      if (!restoreCachedTicket()) {
        error.value = getErrorMessage(
          ticketResponse.reason,
          'Could not generate your personal ticket.'
        )
      }
    }
  } catch (err) {
    if (!restoreCachedTicket()) {
      error.value = getErrorMessage(err, 'Could not load the check-in code.')
    }
  } finally {
    loading.value = false
  }
}

const downloadQR = () => {
  if (!qrCode.value) return

  const link = document.createElement('a')
  link.href = qrCode.value
  link.download = `meetCITAD-${event.value?._id || 'event'}-qr.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const printQR = () => {
  window.print()
}

onMounted(load)
</script>

<style scoped>
.qr-page {
  min-height: calc(100vh - 64px - 300px);
}

.qr-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.qr-frame {
  width: 332px;
  max-width: 100%;
  padding: 16px;
  background: #ffffff;
  border: 1px solid rgba(15, 42, 68, 0.15);
}

.qr-placeholder {
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.v-theme--dark .qr-card {
  border-color: rgba(255, 255, 255, 0.08);
}

@media print {
  .qr-page :deep(.v-btn),
  .qr-page :deep(.v-app-bar),
  .qr-page :deep(.v-footer) {
    display: none !important;
  }

  .qr-card {
    box-shadow: none !important;
    border: none !important;
  }
}
</style>
