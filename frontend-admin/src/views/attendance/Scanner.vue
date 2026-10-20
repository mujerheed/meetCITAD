<template>
  <div>
    <PageHeader
      title="QR Scanner"
      subtitle="Scan participant tickets to record attendance. Scans are queued safely when the connection drops."
      icon="mdi-qrcode-scan"
    >
      <template #actions>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-account-check-outline" :to="attendanceLink">
          Attendance Register
        </v-btn>
      </template>
    </PageHeader>

    <v-alert v-if="!online" type="warning" variant="tonal" class="mb-4" icon="mdi-wifi-off">
      You are offline. Scans will be queued and can be submitted when the connection returns.
    </v-alert>

    <v-row dense>
      <v-col cols="12" lg="7">
        <v-card class="admin-card mb-4" elevation="0">
          <v-card-text class="pa-5">
            <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
              <div>
                <div class="section-title">Camera scanner</div>
                <div class="section-caption">Point the camera at a participant's personal ticket QR code.</div>
              </div>
              <v-chip size="small" :color="scanning ? 'success' : 'grey'" variant="tonal">
                {{ scanning ? 'Camera active' : 'Camera idle' }}
              </v-chip>
            </div>

            <v-select
              v-model="contextEventId"
              :items="eventOptions"
              label="Event context (optional)"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              class="mb-4"
            ></v-select>

            <div class="camera-frame">
              <video ref="videoEl" class="camera-video" playsinline muted></video>
              <canvas ref="canvasEl" class="d-none"></canvas>

              <div v-if="!scanning" class="camera-placeholder">
                <v-icon size="52" color="grey-lighten-1">mdi-camera-outline</v-icon>
                <div class="mt-2 text-body-2 text-medium-emphasis">
                  Start the camera to scan tickets.
                </div>
              </div>

              <div v-if="scanning" class="scan-target" aria-hidden="true"></div>
            </div>

            <div class="d-flex flex-wrap ga-2 mt-4">
              <v-btn
                v-if="!scanning"
                color="accent"
                variant="flat"
                elevation="0"
                prepend-icon="mdi-camera"
                :loading="cameraStarting"
                @click="startCamera"
              >
                Start Camera
              </v-btn>
              <v-btn
                v-else
                color="error"
                variant="outlined"
                prepend-icon="mdi-camera-off"
                @click="stopCamera"
              >
                Stop Camera
              </v-btn>

              <v-btn variant="outlined" color="primary" prepend-icon="mdi-keyboard-outline" @click="showManual = !showManual">
                Enter code manually
              </v-btn>
            </div>

            <v-alert v-if="cameraError" type="error" variant="tonal" density="comfortable" class="mt-4">
              {{ cameraError }}
            </v-alert>

            <div v-if="showManual" class="mt-4">
              <v-textarea
                v-model="manualCode"
                label="Ticket QR content"
                variant="outlined"
                rows="3"
                hint="Paste the exact content of the participant ticket QR code."
                persistent-hint
              ></v-textarea>
              <v-btn
                class="mt-2"
                color="primary"
                variant="flat"
                elevation="0"
                prepend-icon="mdi-check"
                :loading="processing"
                @click="submitManual"
              >
                Submit ticket
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-card v-if="queue.length" class="admin-card" elevation="0">
          <v-card-text class="pa-5">
            <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
              <div>
                <div class="section-title">Queued offline scans</div>
                <div class="section-caption">{{ queue.length }} scan(s) waiting to be submitted.</div>
              </div>
              <v-btn
                color="primary"
                variant="tonal"
                size="small"
                prepend-icon="mdi-cloud-upload-outline"
                :loading="retrying"
                :disabled="!online"
                @click="retryQueue"
              >
                Submit queued scans
              </v-btn>
            </div>

            <div v-for="(item, index) in queue" :key="item.queuedAt + index" class="queue-row">
              <v-icon size="16" color="warning">mdi-clock-outline</v-icon>
              <div class="flex-grow-1">
                <div class="text-body-2 mono">{{ truncateCode(item.qrData) }}</div>
                <div class="text-caption text-medium-emphasis">
                  Queued {{ formatDateTime(item.queuedAt) }}
                </div>
              </div>
              <v-btn icon="mdi-close" variant="text" size="x-small" aria-label="Remove queued scan" @click="removeQueued(index)"></v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card class="admin-card mb-4" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-3">Last scan result</div>

            <div v-if="!result" class="result-empty">
              <v-icon size="42" color="grey-lighten-1">mdi-qrcode-scan</v-icon>
              <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
                Scan a participant ticket to see the result here.
              </p>
            </div>

            <div v-else>
              <v-alert
                :type="result.type"
                variant="tonal"
                density="comfortable"
                class="mb-4"
                :icon="result.type === 'success' ? 'mdi-check-decagram' : result.type === 'warning' ? 'mdi-alert-outline' : 'mdi-close-circle-outline'"
              >
                <div class="font-weight-bold">{{ result.title }}</div>
                <div class="text-body-2 mt-1">{{ result.message }}</div>
              </v-alert>

              <div v-if="result.user" class="result-person">
                <v-avatar size="46" color="primary" class="text-white font-weight-bold">
                  {{ initials(result.user.fullname) }}
                </v-avatar>
                <div>
                  <div class="font-weight-bold">{{ result.user.fullname }}</div>
                  <div class="text-caption text-medium-emphasis">{{ result.user.email }}</div>
                  <div class="text-caption text-medium-emphasis">{{ result.user.organisation || 'CITAD participant' }}</div>
                </div>
              </div>

              <div v-if="result.event" class="result-details">
                <div class="info-row">
                  <span>Event</span>
                  <strong>{{ result.event.title }}</strong>
                </div>
                <div class="info-row">
                  <span>Check-in time</span>
                  <strong>{{ formatDateTime(result.checkInTime) || '—' }}</strong>
                </div>
                <div v-if="result.contextMismatch" class="info-row">
                  <span>Context</span>
                  <strong class="text-warning">Different from selected event</strong>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="admin-card" elevation="0">
          <v-card-text class="pa-5">
            <div class="d-flex align-center justify-space-between mb-3">
              <div>
                <div class="section-title">Recent scans</div>
                <div class="section-caption">Latest check-ins recorded from this device</div>
              </div>
              <v-btn
                v-if="recent.length"
                variant="text"
                size="small"
                color="primary"
                @click="clearRecent"
              >
                Clear
              </v-btn>
            </div>

            <div v-if="!recent.length" class="text-body-2 text-medium-emphasis py-4">
              No scans yet on this device.
            </div>

            <div v-for="item in recent" :key="item.id" class="recent-scan">
              <v-icon
                size="18"
                :color="item.type === 'success' ? 'success' : item.type === 'warning' ? 'warning' : 'error'"
              >
                {{ item.type === 'success' ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline' }}
              </v-icon>
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-medium">{{ item.name || 'Unknown ticket' }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.eventTitle || item.message }}</div>
              </div>
              <div class="text-caption text-medium-emphasis">{{ item.time }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import jsQR from 'jsqr'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import { formatDate, formatDateTime } from '@/utils/formatters'

const { notifySuccess, notifyError, notifyInfo } = useSnackbar()

const QUEUE_KEY = 'admin_scan_queue'
const RECENT_KEY = 'admin_recent_scans'

const videoEl = ref(null)
const canvasEl = ref(null)
const scanning = ref(false)
const cameraStarting = ref(false)
const cameraError = ref('')
const processing = ref(false)
const showManual = ref(false)
const manualCode = ref('')
const result = ref(null)
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const contextEventId = ref(null)
const events = ref([])
const retrying = ref(false)

const queue = ref(readJson(QUEUE_KEY, []))
const recent = ref(readJson(RECENT_KEY, []))

let stream = null
let animationFrame = null
let lastCode = ''
let lastCodeAt = 0
let audioContext = null

const eventOptions = computed(() =>
  events.value.map((event) => ({
    title: `${event.title} — ${formatDate(event.startDate)}`,
    value: event._id,
  }))
)

const attendanceLink = computed(() =>
  contextEventId.value ? `/attendance?event=${contextEventId.value}` : '/attendance'
)

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function initials(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function truncateCode(value = '') {
  const text = String(value)
  return text.length > 64 ? `${text.slice(0, 64)}…` : text
}

function beep(success) {
  try {
    audioContext = audioContext || new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.frequency.value = success ? 880 : 220
    oscillator.type = 'sine'
    gain.gain.value = 0.06
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.12)
  } catch {
    // Sound feedback is optional.
  }
}

function updateOnline() {
  online.value = navigator.onLine
  if (online.value && queue.value.length) {
    retryQueue()
  }
}

const startCamera = async () => {
  cameraError.value = ''
  cameraStarting.value = true

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access is not supported in this browser.')
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })

    if (videoEl.value) {
      videoEl.value.srcObject = stream
      await videoEl.value.play()
    }

    scanning.value = true
    tick()
  } catch (err) {
    cameraError.value =
      err?.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access and try again.'
        : err?.message || 'Could not start the camera.'
  } finally {
    cameraStarting.value = false
  }
}

const stopCamera = () => {
  scanning.value = false
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = null

  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }

  if (videoEl.value) videoEl.value.srcObject = null
}

const tick = () => {
  if (!scanning.value) return

  const video = videoEl.value
  const canvas = canvasEl.value

  if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
    const width = video.videoWidth
    const height = video.videoHeight

    if (width && height) {
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(video, 0, 0, width, height)
      const imageData = context.getImageData(0, 0, width, height)
      const code = jsQR(imageData.data, width, height, {
        inversionAttempts: 'dontInvert',
      })

      if (code?.data) {
        const now = Date.now()
        if (code.data !== lastCode || now - lastCodeAt > 4000) {
          lastCode = code.data
          lastCodeAt = now
          submitScan(code.data)
        }
      }
    }
  }

  animationFrame = requestAnimationFrame(tick)
}

const submitScan = async (qrData, fromQueue = false) => {
  if (processing.value) return
  processing.value = true

  try {
    const response = await api.attendance.scan(qrData)
    const scannedEvent = response.event
    const contextMismatch =
      Boolean(contextEventId.value) &&
      Boolean(scannedEvent?._id || scannedEvent?.id) &&
      String(scannedEvent._id || scannedEvent.id) !== String(contextEventId.value)

    const already = Boolean(response.alreadyCheckedIn)
    result.value = {
      type: already ? 'warning' : 'success',
      title: already ? 'Already checked in' : 'Attendance recorded',
      message:
        response.message ||
        (already
          ? 'This participant was already marked as attended.'
          : 'The participant has been checked in.'),
      user: response.user,
      event: scannedEvent,
      checkInTime: response.checkInTime,
      contextMismatch,
    }

    beep(true)
    addRecent({
      type: result.value.type,
      name: response.user?.fullname,
      eventTitle: scannedEvent?.title,
      message: result.value.message,
    })

    if (!fromQueue) notifySuccess(result.value.message)
    return true
  } catch (err) {
    if (!err.response) {
      queue.value.push({ qrData, queuedAt: new Date().toISOString() })
      writeJson(QUEUE_KEY, queue.value)
      result.value = {
        type: 'warning',
        title: 'Scan queued',
        message: 'The server is unreachable. This scan will be submitted when the connection returns.',
      }
      beep(false)
      addRecent({
        type: 'warning',
        name: 'Queued scan',
        message: result.value.message,
      })
      if (!fromQueue) notifyInfo('Scan queued for later submission.')
      return false
    }

    const message = getErrorMessage(err, 'This ticket could not be checked in.')
    result.value = {
      type: 'error',
      title: 'Check-in failed',
      message,
    }
    beep(false)
    addRecent({ type: 'error', name: 'Rejected ticket', message })
    if (!fromQueue) notifyError(message)
    return false
  } finally {
    processing.value = false
  }
}

const addRecent = (item) => {
  recent.value.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time: new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    ...item,
  })
  recent.value = recent.value.slice(0, 20)
  writeJson(RECENT_KEY, recent.value)
}

const clearRecent = () => {
  recent.value = []
  writeJson(RECENT_KEY, [])
}

const removeQueued = (index) => {
  queue.value.splice(index, 1)
  writeJson(QUEUE_KEY, queue.value)
}

const retryQueue = async () => {
  if (!online.value || retrying.value || !queue.value.length) return
  retrying.value = true

  let succeeded = 0
  let rejected = 0
  const remaining = []

  for (const item of queue.value) {
    try {
      const response = await api.attendance.scan(item.qrData)
      succeeded += 1
      addRecent({
        type: response.alreadyCheckedIn ? 'warning' : 'success',
        name: response.user?.fullname,
        eventTitle: response.event?.title,
        message: response.message || 'Queued scan submitted.',
      })
    } catch (err) {
      if (!err.response) {
        remaining.push(item)
        continue
      }

      rejected += 1
      addRecent({
        type: 'error',
        name: 'Rejected queued scan',
        message: getErrorMessage(err, 'Invalid ticket.'),
      })
    }
  }

  queue.value = remaining
  writeJson(QUEUE_KEY, queue.value)
  retrying.value = false

  if (succeeded) notifySuccess(`${succeeded} queued scan(s) submitted.`)
  if (rejected) notifyError(`${rejected} queued scan(s) were rejected.`)
  if (remaining.length) notifyInfo(`${remaining.length} scan(s) remain queued.`)
}

const submitManual = async () => {
  if (!manualCode.value.trim()) {
    notifyError('Paste the ticket QR content first.')
    return
  }

  await submitScan(manualCode.value.trim())
  manualCode.value = ''
}

const loadEvents = async () => {
  try {
    const response = await api.events.list({ limit: 100, sort: 'startDateTime' })
    events.value = response.events || []
  } catch {
    // Event context is optional; scanning still works without it.
  }
}

onMounted(() => {
  loadEvents()
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
})

onBeforeUnmount(() => {
  stopCamera()
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
})
</script>

<style scoped>
.camera-frame {
  position: relative;
  background: #101418;
  border-radius: 4px;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.scan-target {
  position: absolute;
  width: min(48%, 230px);
  aspect-ratio: 1;
  border: 2px solid #c9a44c;
  border-radius: 6px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.28);
}

.queue-row,
.recent-scan {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--admin-border);
}

.queue-row:last-child,
.recent-scan:last-child {
  border-bottom: 0;
}

.result-empty {
  text-align: center;
  padding: 26px 10px;
}

.result-person {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  margin-bottom: 14px;
}

.result-details {
  display: grid;
  gap: 4px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  font-size: 0.8rem;
  color: var(--admin-muted);
}

.info-row strong {
  color: rgb(var(--v-theme-on-surface));
  text-align: right;
}
</style>
