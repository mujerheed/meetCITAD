<template>
  <div class="my-events-page">
    <v-container class="py-8">
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col cols="12">
          <h1 class="text-h4 font-weight-bold mb-2">My Events</h1>
          <p class="text-body-1 text-medium-emphasis">
            Events you have registered for and the events you have attended.
          </p>
        </v-col>
      </v-row>

      <!-- Offline notice -->
      <v-alert
        v-if="offline"
        type="info"
        variant="tonal"
        class="mb-6"
        icon="mdi-wifi-off"
      >
        You are offline. Showing your last saved events — actions like
        registration or cancellation will resume when you reconnect.
      </v-alert>

      <!-- Error State -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-6"
        closable
        @click:close="eventStore.clearError()"
      >
        {{ error }}
        <template #append>
          <v-btn variant="text" size="small" @click="loadEvents">Retry</v-btn>
        </template>
      </v-alert>

      <!-- Tabs -->
      <v-tabs v-model="tab" color="primary" class="mb-6" show-arrows>
        <v-tab value="registered">
          <v-icon start>mdi-calendar-check</v-icon>
          Registered
          <v-chip size="x-small" class="ml-2" variant="tonal">
            {{ registeredEvents.length }}
          </v-chip>
        </v-tab>
        <v-tab value="attended">
          <v-icon start>mdi-check-decagram</v-icon>
          Attended
          <v-chip size="x-small" class="ml-2" variant="tonal">
            {{ attendedEvents.length }}
          </v-chip>
        </v-tab>
      </v-tabs>

      <v-divider class="mb-8"></v-divider>

      <!-- Loading State -->
      <v-row v-if="loading">
        <v-col v-for="n in 3" :key="n" cols="12" md="6" lg="4">
          <v-skeleton-loader type="image, article, actions"></v-skeleton-loader>
        </v-col>
      </v-row>

      <!-- Events Grid -->
      <v-row v-else-if="visibleEvents.length > 0">
        <v-col
          v-for="event in visibleEvents"
          :key="event._id"
          cols="12"
          md="6"
          lg="4"
        >
          <v-card class="event-card h-100" elevation="1">
            <v-img :src="event.banner" height="180" cover>
              <v-chip
                :color="statusFor(event).color"
                size="small"
                label
                class="ma-3"
              >
                {{ statusFor(event).text }}
              </v-chip>
            </v-img>

            <v-card-title class="text-h6 pt-4">
              {{ event.title }}
            </v-card-title>

            <v-card-subtitle class="py-2">
              <div class="d-flex align-center mb-1">
                <v-icon size="small" class="mr-2">mdi-calendar</v-icon>
                <span class="text-caption">{{ formatDate(event.startDate) }}</span>
              </div>
              <div class="d-flex align-center mb-1">
                <v-icon size="small" class="mr-2">mdi-clock-outline</v-icon>
                <span class="text-caption">
                  {{ formatTime(event.startTime) }}
                  <template v-if="event.endTime"> - {{ formatTime(event.endTime) }}</template>
                </span>
              </div>
              <div class="d-flex align-center">
                <v-icon size="small" class="mr-2">mdi-map-marker</v-icon>
                <span class="text-caption">{{ event.location }}</span>
              </div>
            </v-card-subtitle>

            <v-card-text class="text-body-2 flex-grow-1">
              {{ truncate(event.shortDescription || event.description, 110) }}
            </v-card-text>

            <v-card-actions class="px-4 pb-4 flex-column align-stretch ga-2">
              <v-btn
                color="primary"
                variant="outlined"
                block
                :to="`/events/${event._id}`"
              >
                View Details
              </v-btn>

              <v-btn
                v-if="showQRCode(event)"
                color="accent"
                variant="flat"
                block
                elevation="0"
                :to="`/my-events/${event._id}/qr`"
              >
                <v-icon start>mdi-qrcode</v-icon>
                Show Check-in QR
              </v-btn>

              <v-btn
                v-if="event.attended && event.certificateIssued"
                color="primary"
                variant="text"
                block
                to="/certificates"
              >
                <v-icon start>mdi-certificate-outline</v-icon>
                View Certificate
              </v-btn>

              <v-btn
                v-if="event.attended"
                color="accent"
                variant="text"
                block
                :to="`/events/${event._id}/feedback`"
              >
                <v-icon start>mdi-message-text-outline</v-icon>
                Leave Feedback
              </v-btn>

              <v-btn
                v-if="!isPast(event)"
                color="primary"
                variant="text"
                block
                @click="addToCalendar(event)"
              >
                <v-icon start>mdi-calendar-plus</v-icon>
                Add to Calendar
              </v-btn>

              <v-btn
                v-if="canCancel(event)"
                color="error"
                variant="text"
                block
                @click="askToCancel(event)"
              >
                Cancel Registration
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-else class="my-12">
        <v-col cols="12" class="text-center">
          <v-icon size="80" color="grey-lighten-1" class="mb-4">
            {{ tab === 'attended' ? 'mdi-check-decagram-outline' : 'mdi-calendar-blank-outline' }}
          </v-icon>
          <h3 class="text-h6 text-medium-emphasis mb-2">
            {{ tab === 'attended' ? 'No attended events yet' : 'No registered events yet' }}
          </h3>
          <p class="text-body-2 text-medium-emphasis mb-6">
            {{
              tab === 'attended'
                ? 'Once you check in to an event, it will appear here.'
                : 'Browse upcoming CITAD programs and register to reserve your place.'
            }}
          </p>
          <v-btn color="accent" variant="flat" elevation="0" to="/events">
            Browse Events
          </v-btn>
        </v-col>
      </v-row>
    </v-container>

    <!-- Cancel Confirmation -->
    <v-dialog v-model="cancelDialog.show" max-width="480">
      <v-card>
        <v-card-title class="text-h6">Cancel registration?</v-card-title>
        <v-card-text>
          You are about to cancel your registration for
          <strong>{{ cancelDialog.event?.title }}</strong>. You can register again
          while spaces remain.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelDialog.show = false">Keep Registration</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="cancelDialog.loading"
            @click="confirmCancel"
          >
            Cancel Registration
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useEventStore } from '@/stores/event'
import { formatDate, formatTime, truncate } from '@/utils/formatters'
import { downloadEventICS } from '@/utils/calendar'
import { cacheGet, cacheSet } from '@/utils/offline'

const eventStore = useEventStore()
const { myEvents, loading, error } = storeToRefs(eventStore)

const tab = ref('registered')
const offline = ref(false)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success',
})

const cancelDialog = reactive({
  show: false,
  event: null,
  loading: false,
})

const isPast = (event) => {
  const date = event.endDate || event.startDate
  if (!date) return false
  return new Date(date) < new Date()
}

const registeredEvents = computed(() =>
  [...myEvents.value]
    .filter((event) => !event.attended && event.registration?.status !== 'cancelled')
    .sort((a, b) => {
      const aPast = isPast(a)
      const bPast = isPast(b)
      if (aPast !== bPast) return aPast ? 1 : -1
      return new Date(a.startDate) - new Date(b.startDate)
    })
)

const attendedEvents = computed(() =>
  [...myEvents.value]
    .filter((event) => event.attended || event.registration?.attended)
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
)

const visibleEvents = computed(() =>
  tab.value === 'attended' ? attendedEvents.value : registeredEvents.value
)

const statusFor = (event) => {
  if (event.attended || event.registration?.attended) {
    return { text: 'Attended', color: 'success' }
  }
  if (event.registration?.status === 'cancelled') {
    return { text: 'Cancelled', color: 'error' }
  }
  if (isPast(event)) {
    return { text: 'Past Event', color: 'grey' }
  }
  if (event.registration?.status === 'pending') {
    return { text: 'Pending Approval', color: 'warning' }
  }
  return { text: 'Upcoming', color: 'primary' }
}

const showQRCode = (event) =>
  !event.attended && !isPast(event) && event.registration?.status !== 'cancelled'

const canCancel = (event) =>
  !event.attended && !isPast(event) && event.registration?.status !== 'cancelled'

const askToCancel = (event) => {
  cancelDialog.event = event
  cancelDialog.show = true
}

const addToCalendar = (event) => {
  if (downloadEventICS(event)) {
    snackbar.message = 'Calendar file downloaded.'
    snackbar.color = 'success'
  } else {
    snackbar.message = 'This event does not have a usable date.'
    snackbar.color = 'error'
  }
  snackbar.show = true
}

const confirmCancel = async () => {
  if (!cancelDialog.event) return

  cancelDialog.loading = true
  try {
    await eventStore.unregisterFromEvent(cancelDialog.event._id)
    snackbar.message = 'Your registration has been cancelled.'
    snackbar.color = 'info'
    snackbar.show = true
    cancelDialog.show = false
    await eventStore.fetchMyEvents()
  } catch (err) {
    snackbar.message =
      err.response?.data?.message || 'Could not cancel the registration.'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    cancelDialog.loading = false
  }
}

const loadEvents = async () => {
  try {
    await eventStore.fetchMyEvents()
    offline.value = false
    cacheSet('myEvents', myEvents.value)
  } catch {
    const cached = cacheGet('myEvents')
    if (cached?.value?.length) {
      eventStore.myEvents = cached.value
      eventStore.clearError()
      offline.value = true
    }
  }
}

onMounted(loadEvents)
</script>

<style scoped>
.my-events-page {
  min-height: calc(100vh - 64px - 300px);
}

.event-card {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  transition: border-color 0.2s ease;
}

.event-card:hover {
  border-color: rgba(15, 42, 68, 0.2);
}

.v-theme--dark .event-card {
  border-color: rgba(255, 255, 255, 0.08);
}

.v-theme--dark .event-card:hover {
  border-color: rgba(255, 255, 255, 0.16);
}

.align-stretch {
  align-items: stretch;
}
</style>
