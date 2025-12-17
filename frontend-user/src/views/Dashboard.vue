<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h3 mb-6">Dashboard</h1>
      </v-col>
    </v-row>

    <!-- Welcome Card -->
    <v-row>
      <v-col cols="12">
        <v-card color="primary" dark class="pa-6">
          <h2 class="text-h4 mb-2">
            Welcome back, {{ currentUser?.firstName }}!
          </h2>
          <p class="text-h6">
            You have {{ registeredEventsCount }} upcoming events
          </p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Stats -->
    <v-row class="mt-4">
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center">
          <v-icon size="48" color="primary" class="mb-3">mdi-calendar-check</v-icon>
          <div class="text-h4 mb-2">{{ myEvents.length }}</div>
          <div class="text-subtitle-1">Registered Events</div>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center">
          <v-icon size="48" color="success" class="mb-3">mdi-certificate</v-icon>
          <div class="text-h4 mb-2">{{ certificatesCount }}</div>
          <div class="text-subtitle-1">Certificates Earned</div>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center">
          <v-icon size="48" color="info" class="mb-3">mdi-calendar-clock</v-icon>
          <div class="text-h4 mb-2">{{ upcomingEventsCount }}</div>
          <div class="text-subtitle-1">Upcoming Events</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Actions -->
    <v-row class="mt-6">
      <v-col cols="12">
        <h2 class="text-h5 mb-4">Quick Actions</h2>
      </v-col>
      
      <v-col cols="12" md="3">
        <v-card to="/events" hover>
          <v-card-text class="text-center pa-6">
            <v-icon size="48" color="primary" class="mb-3">mdi-calendar-search</v-icon>
            <div class="text-h6">Browse Events</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="3">
        <v-card to="/my-events" hover>
          <v-card-text class="text-center pa-6">
            <v-icon size="48" color="primary" class="mb-3">mdi-calendar-multiple</v-icon>
            <div class="text-h6">My Events</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="3">
        <v-card to="/certificates" hover>
          <v-card-text class="text-center pa-6">
            <v-icon size="48" color="primary" class="mb-3">mdi-certificate</v-icon>
            <div class="text-h6">Certificates</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="3">
        <v-card to="/profile" hover>
          <v-card-text class="text-center pa-6">
            <v-icon size="48" color="primary" class="mb-3">mdi-account-circle</v-icon>
            <div class="text-h6">My Profile</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent Events -->
    <v-row class="mt-6" v-if="myEvents.length > 0">
      <v-col cols="12">
        <h2 class="text-h5 mb-4">Your Recent Events</h2>
      </v-col>
      
      <v-col
        v-for="event in myEvents.slice(0, 3)"
        :key="event._id"
        cols="12"
        md="4"
      >
        <v-card>
          <v-img
            :src="event.banner || 'https://via.placeholder.com/400x200'"
            height="150"
            cover
          ></v-img>
          <v-card-title>{{ event.title }}</v-card-title>
          <v-card-subtitle>
            <v-icon size="small">mdi-calendar</v-icon>
            {{ formatDate(event.startDate) }}
          </v-card-subtitle>
          <v-card-actions>
            <v-btn color="primary" :to="`/events/${event._id}`">
              View Details
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useEventStore } from '@/stores/event'

const authStore = useAuthStore()
const eventStore = useEventStore()

const currentUser = computed(() => authStore.currentUser)
const myEvents = computed(() => eventStore.myEvents)
const loading = computed(() => eventStore.loading)

const registeredEventsCount = computed(() => 
  myEvents.value.filter(e => new Date(e.startDate) > new Date()).length
)

const upcomingEventsCount = computed(() => registeredEventsCount.value)
const certificatesCount = computed(() => 0) // TODO: Implement certificates count

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

onMounted(async () => {
  try {
    await eventStore.fetchMyEvents()
  } catch (error) {
    console.error('Failed to fetch events:', error)
  }
})
</script>
