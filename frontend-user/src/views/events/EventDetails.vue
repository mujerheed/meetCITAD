<template>
  <div class="event-details-page">
    <!-- Loading State -->
    <v-container v-if="loading" class="py-16">
      <v-row>
        <v-col cols="12" class="text-center">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="text-body-2 text-medium-emphasis mt-4">Loading event details...</p>
        </v-col>
      </v-row>
    </v-container>

    <!-- Event Not Found -->
    <v-container v-else-if="!event" class="py-16">
      <v-row>
        <v-col cols="12" class="text-center">
          <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-calendar-remove</v-icon>
          <h2 class="text-h5 text-medium-emphasis mb-2">Event not found</h2>
          <p class="text-body-2 text-medium-emphasis mb-4">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <v-btn color="primary" variant="outlined" to="/events">
            Browse All Events
          </v-btn>
        </v-col>
      </v-row>
    </v-container>

    <!-- Event Details -->
    <div v-else>
      <!-- Breadcrumbs -->
      <v-container class="py-4">
        <v-breadcrumbs :items="breadcrumbs" class="pa-0">
          <template v-slot:divider>
            <v-icon icon="mdi-chevron-right"></v-icon>
          </template>
        </v-breadcrumbs>
      </v-container>

      <!-- Event Banner -->
      <v-img
        :src="event.banner || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200'"
        height="400"
        cover
        class="event-banner"
      >
        <div class="banner-overlay">
          <v-container class="h-100 d-flex align-end">
            <div class="text-white pb-8">
              <v-chip
                v-if="event.category"
                color="accent"
                size="small"
                label
                class="mb-2"
              >
                {{ event.category }}
              </v-chip>
              <h1 class="text-h3 font-weight-bold mb-2">{{ event.title }}</h1>
            </div>
          </v-container>
        </div>
      </v-img>

      <!-- Event Content -->
      <v-container class="py-8">
        <v-row>
          <!-- Main Content Column -->
          <v-col cols="12" md="8">
            <!-- Event Metadata -->
            <v-card class="mb-6" elevation="1">
              <v-card-text>
                <v-row>
                  <v-col cols="12" sm="6" class="d-flex align-center py-2">
                    <v-icon color="primary" class="mr-3">mdi-calendar</v-icon>
                    <div>
                      <div class="text-caption text-medium-emphasis">Date</div>
                      <div class="text-body-2 font-weight-medium">
                        {{ formatDate(event.startDate) }}
                      </div>
                    </div>
                  </v-col>
                  <v-col cols="12" sm="6" class="d-flex align-center py-2">
                    <v-icon color="primary" class="mr-3">mdi-clock-outline</v-icon>
                    <div>
                      <div class="text-caption text-medium-emphasis">Time</div>
                      <div class="text-body-2 font-weight-medium">
                        {{ formatTime(event.startTime) }}
                        <span v-if="event.endTime"> - {{ formatTime(event.endTime) }}</span>
                      </div>
                    </div>
                  </v-col>
                  <v-col cols="12" sm="6" class="d-flex align-center py-2">
                    <v-icon color="primary" class="mr-3">mdi-map-marker</v-icon>
                    <div>
                      <div class="text-caption text-medium-emphasis">Venue</div>
                      <div class="text-body-2 font-weight-medium">
                        {{ event.location || 'CITAD Center, Kano' }}
                      </div>
                    </div>
                  </v-col>
                  <v-col cols="12" sm="6" class="d-flex align-center py-2">
                    <v-icon color="primary" class="mr-3">mdi-account-group</v-icon>
                    <div>
                      <div class="text-caption text-medium-emphasis">Capacity</div>
                      <div class="text-body-2 font-weight-medium">
                        {{ event.attendees?.length || 0 }} / {{ event.maxAttendees || 'Unlimited' }} attendees
                      </div>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Event Description -->
            <v-card class="mb-6" elevation="1">
              <v-card-title class="text-h6">About This Event</v-card-title>
              <v-card-text>
                <div class="event-description">{{ event.description }}</div>
              </v-card-text>
            </v-card>

            <!-- Event Agenda (if available) -->
            <v-card v-if="event.agenda && event.agenda.length > 0" class="mb-6" elevation="1">
              <v-card-title class="text-h6">Event Agenda</v-card-title>
              <v-card-text>
                <v-timeline side="end" density="compact">
                  <v-timeline-item
                    v-for="(item, index) in event.agenda"
                    :key="index"
                    dot-color="primary"
                    size="small"
                  >
                    <template v-slot:opposite>
                      <div class="text-caption text-medium-emphasis">
                        {{ item.time }}
                      </div>
                    </template>
                    <div>
                      <div class="text-body-2 font-weight-medium">{{ item.title }}</div>
                      <div class="text-caption text-medium-emphasis">{{ item.description }}</div>
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Sidebar Column -->
          <v-col cols="12" md="4">
            <!-- Registration Card -->
            <v-card class="sticky-card" elevation="2">
              <v-card-text>
                <!-- Event Status Badge -->
                <v-chip
                  :color="getEventStatusColor()"
                  class="mb-4"
                  block
                  size="large"
                >
                  {{ getEventStatusText() }}
                </v-chip>

                <!-- Registration Status -->
                <div v-if="isRegistered" class="text-center mb-4">
                  <v-icon size="48" color="success" class="mb-2">mdi-check-circle</v-icon>
                  <div class="text-body-1 font-weight-medium mb-2">You're registered!</div>
                  <div class="text-caption text-medium-emphasis">
                    Registration confirmation sent to your email
                  </div>
                </div>

                <!-- Registration Actions -->
                <div class="d-flex flex-column ga-2">
                  <!-- Register Button (Not authenticated or not registered) -->
                  <v-btn
                    v-if="!isRegistered && !isPastEvent"
                    color="accent"
                    size="large"
                    block
                    elevation="0"
                    :disabled="isFull"
                    @click="handleRegister"
                    :loading="registering"
                  >
                    <v-icon start>mdi-account-plus</v-icon>
                    {{ isFull ? 'Event Full' : 'Register Now' }}
                  </v-btn>

                  <!-- Unregister Button -->
                  <v-btn
                    v-if="isRegistered && !isPastEvent"
                    color="error"
                    size="large"
                    variant="outlined"
                    block
                    @click="handleUnregister"
                    :loading="unregistering"
                  >
                    <v-icon start>mdi-account-minus</v-icon>
                    Cancel Registration
                  </v-btn>

                  <!-- QR Code Button (if registered) -->
                  <v-btn
                    v-if="isRegistered"
                    color="primary"
                    size="large"
                    variant="outlined"
                    block
                    :to="`/my-events/${event._id}/qr`"
                  >
                    <v-icon start>mdi-qrcode</v-icon>
                    Show QR Code
                  </v-btn>

                  <!-- Past Event Notice -->
                  <v-alert
                    v-if="isPastEvent"
                    type="info"
                    variant="tonal"
                    density="compact"
                  >
                    This event has ended
                  </v-alert>
                </div>

                <v-divider class="my-4"></v-divider>

                <!-- Feedback (available after attending) -->
                <div v-if="hasAttended" class="mb-4">
                  <v-btn
                    color="accent"
                    variant="flat"
                    elevation="0"
                    block
                    :to="`/events/${event._id}/feedback`"
                  >
                    <v-icon start>mdi-message-text-outline</v-icon>
                    Share Your Feedback
                  </v-btn>
                </div>

                <!-- Share Section -->
                <div>
                  <div class="text-caption text-medium-emphasis mb-2">Share this event</div>
                  <div class="d-flex ga-2">
                    <v-btn
                      icon
                      size="small"
                      variant="outlined"
                      aria-label="Share on Facebook"
                      @click="shareOnSocial('facebook')"
                    >
                      <v-icon>mdi-facebook</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      size="small"
                      variant="outlined"
                      aria-label="Share on X"
                      @click="shareOnSocial('twitter')"
                    >
                      <v-icon>mdi-twitter</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      size="small"
                      variant="outlined"
                      aria-label="Share on LinkedIn"
                      @click="shareOnSocial('linkedin')"
                    >
                      <v-icon>mdi-linkedin</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      size="small"
                      variant="outlined"
                      aria-label="Copy event link"
                      @click="copyLink"
                    >
                      <v-icon>mdi-link-variant</v-icon>
                    </v-btn>
                  </div>
                </div>

                <v-divider class="my-4"></v-divider>

                <!-- Calendar Integration -->
                <div>
                  <div class="text-caption text-medium-emphasis mb-2">Add to your calendar</div>
                  <v-menu offset-y>
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        color="primary"
                        variant="outlined"
                        block
                        prepend-icon="mdi-calendar-plus"
                      >
                        Add to Calendar
                      </v-btn>
                    </template>

                    <v-list density="compact">
                      <v-list-item
                        prepend-icon="mdi-download"
                        @click="addToCalendar"
                      >
                        <v-list-item-title>Download .ics file</v-list-item-title>
                      </v-list-item>
                      <v-list-item
                        prepend-icon="mdi-google"
                        @click="openCalendar('google')"
                      >
                        <v-list-item-title>Google Calendar</v-list-item-title>
                      </v-list-item>
                      <v-list-item
                        prepend-icon="mdi-microsoft-outlook"
                        @click="openCalendar('outlook')"
                      >
                        <v-list-item-title>Outlook Calendar</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Login Modal -->
    <v-dialog v-model="showLoginModal" max-width="500">
      <v-card>
        <v-card-title class="text-h6">Sign in or create an account</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-2">
            To register for this event, sign in to your participant account or create a new one.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" variant="text" @click="showLoginModal = false">
            Cancel
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn variant="outlined" color="primary" @click="goToSignup">
            Create Account
          </v-btn>
          <v-btn color="accent" variant="flat" @click="goToLogin">
            Sign In
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventStore } from '@/stores/event'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import api from '@/api'
import { formatDate as formatDateValue, formatTime } from '@/utils/formatters'
import {
  downloadEventICS,
  googleCalendarUrl,
  outlookCalendarUrl,
} from '@/utils/calendar'

const route = useRoute()
const router = useRouter()
const eventStore = useEventStore()
const authStore = useAuthStore()

const { isAuthenticated } = storeToRefs(authStore)

// State
const event = ref(null)
const loading = ref(true)
const registering = ref(false)
const unregistering = ref(false)
const registrationStatus = ref(null)
const showLoginModal = ref(false)
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Computed
const breadcrumbs = computed(() => [
  {
    title: 'Home',
    disabled: false,
    to: '/'
  },
  {
    title: 'Events',
    disabled: false,
    to: '/events'
  },
  {
    title: event.value?.title || 'Event Details',
    disabled: true
  }
])

const isRegistered = computed(() => {
  if (!event.value) return false

  if (registrationStatus.value?.isRegistered) return true

  if (
    event.value.registrationStatus &&
    ['confirmed', 'registered', 'attended'].includes(event.value.registrationStatus)
  ) {
    return true
  }

  const userId = authStore.currentUser?._id || authStore.currentUser?.id
  if (!userId) return false

  return (event.value.attendees || []).some((attendee) => {
    const attendeeId = attendee?._id || attendee?.userId || attendee
    return String(attendeeId) === String(userId)
  })
})

const isPastEvent = computed(() => {
  if (!event.value) return false
  return new Date(event.value.endDate || event.value.startDate) < new Date()
})

const isFull = computed(() => {
  if (!event.value) return false
  const capacity = event.value.capacity || event.value.maxAttendees
  if (!capacity) return false
  const registered =
    event.value.registeredCount ?? event.value.attendees?.length ?? 0
  return registered >= capacity
})

const hasAttended = computed(
  () =>
    Boolean(registrationStatus.value?.attended) ||
    Boolean(registrationStatus.value?.registration?.attended)
)

// Methods
const formatDate = (dateString) =>
  formatDateValue(dateString, { weekday: 'long', month: 'long' })

const getEventStatusColor = () => {
  if (isPastEvent.value) return 'grey'
  if (isFull.value) return 'error'
  return 'success'
}

const getEventStatusText = () => {
  if (isPastEvent.value) return 'Event Ended'
  if (isFull.value) return 'Fully Booked'
  return 'Registration Open'
}

const handleRegister = async () => {
  // Check authentication
  if (!isAuthenticated.value) {
    showLoginModal.value = true
    return
  }

  try {
    registering.value = true
    await eventStore.registerForEvent(event.value._id)
    
    // Refresh event data
    await fetchEvent()
    
    snackbar.value = {
      show: true,
      message: 'Successfully registered for event!',
      color: 'success'
    }
  } catch (error) {
    snackbar.value = {
      show: true,
      message: error.response?.data?.message || 'Failed to register for event',
      color: 'error'
    }
  } finally {
    registering.value = false
  }
}

const handleUnregister = async () => {
  try {
    unregistering.value = true
    await eventStore.unregisterFromEvent(event.value._id)
    
    // Refresh event data
    await fetchEvent()
    
    snackbar.value = {
      show: true,
      message: 'Registration cancelled successfully',
      color: 'info'
    }
  } catch (error) {
    snackbar.value = {
      show: true,
      message: error.response?.data?.message || 'Failed to cancel registration',
      color: 'error'
    }
  } finally {
    unregistering.value = false
  }
}

const goToLogin = () => {
  showLoginModal.value = false
  router.push({
    name: 'Login',
    query: { redirect: route.fullPath }
  })
}

const goToSignup = () => {
  showLoginModal.value = false
  router.push({
    name: 'Signup',
    query: { redirect: route.fullPath }
  })
}

const shareOnSocial = (platform) => {
  const url = window.location.href
  const title = event.value.title
  
  let shareUrl = ''
  switch (platform) {
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
      break
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
      break
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
      break
  }
  
  if (shareUrl) {
    window.open(shareUrl, '_blank', 'width=600,height=400')
  }
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    snackbar.value = {
      show: true,
      message: 'Link copied to clipboard!',
      color: 'success'
    }
  } catch (error) {
    snackbar.value = {
      show: true,
      message: 'Failed to copy link',
      color: 'error'
    }
  }
}

const addToCalendar = () => {
  if (!event.value) return

  if (downloadEventICS(event.value)) {
    snackbar.value = {
      show: true,
      message: 'Calendar file downloaded.',
      color: 'success',
    }
  } else {
    snackbar.value = {
      show: true,
      message: 'This event does not have a usable date.',
      color: 'error',
    }
  }
}

const openCalendar = (provider) => {
  if (!event.value) return

  const url =
    provider === 'google'
      ? googleCalendarUrl(event.value)
      : outlookCalendarUrl(event.value)

  if (url) {
    window.open(url, '_blank', 'noopener')
  }
}

const fetchRegistrationStatus = async () => {
  if (!isAuthenticated.value) {
    registrationStatus.value = null
    return
  }

  try {
    registrationStatus.value = await api.events.getEventStatus(route.params.id)
  } catch {
    // The event may not support status lookups yet; fall back to attendee data.
    registrationStatus.value = null
  }
}

const fetchEvent = async () => {
  try {
    loading.value = true
    const response = await eventStore.fetchEventById(route.params.id)
    event.value = response
    await fetchRegistrationStatus()
  } catch (error) {
    console.error('Error fetching event:', error)
    event.value = null
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchEvent()
})
</script>

<style scoped>
.event-details-page {
  min-height: calc(100vh - 64px - 300px);
}

.event-banner {
  position: relative;
}

.banner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(15,42,68,0.8));
}

.event-description {
  line-height: 1.8;
  color: #374151;
  white-space: pre-line;
}

.v-theme--dark .event-description {
  color: #d1d5db;
}

.sticky-card {
  position: sticky;
  top: 80px;
}

@media (max-width: 960px) {
  .event-banner {
    height: 300px !important;
  }
  
  .sticky-card {
    position: relative;
    top: 0;
  }
}
</style>
