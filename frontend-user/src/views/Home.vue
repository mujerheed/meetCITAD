<template>
  <v-container>
    <!-- Hero Section -->
    <v-row class="my-12">
      <v-col cols="12" md="6" class="d-flex align-center">
        <div>
          <h1 class="text-h2 font-weight-bold mb-4">
            Welcome to meetCITAD
          </h1>
          <p class="text-h6 mb-6">
            Discover and register for exciting events. Connect with your community and never miss an opportunity.
          </p>
          <v-btn
            color="primary"
            size="large"
            to="/events"
            prepend-icon="mdi-calendar"
          >
            Browse Events
          </v-btn>
          <v-btn
            v-if="!isAuthenticated"
            color="secondary"
            size="large"
            to="/signup"
            class="ml-4"
            prepend-icon="mdi-account-plus"
          >
            Sign Up
          </v-btn>
        </div>
      </v-col>
      <v-col cols="12" md="6">
        <v-img
          src="https://via.placeholder.com/600x400"
          alt="Events"
          class="rounded-lg"
        ></v-img>
      </v-col>
    </v-row>

    <!-- Features Section -->
    <v-row class="my-12">
      <v-col cols="12">
        <h2 class="text-h3 text-center mb-8">Why Choose meetCITAD?</h2>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center h-100">
          <v-icon size="64" color="primary" class="mb-4">mdi-calendar-check</v-icon>
          <h3 class="text-h5 mb-3">Easy Registration</h3>
          <p>Register for events with just a few clicks. Get instant confirmations and updates.</p>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center h-100">
          <v-icon size="64" color="primary" class="mb-4">mdi-certificate</v-icon>
          <h3 class="text-h5 mb-3">Digital Certificates</h3>
          <p>Receive digital certificates for attended events. Download and share with ease.</p>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center h-100">
          <v-icon size="64" color="primary" class="mb-4">mdi-bell-ring</v-icon>
          <h3 class="text-h5 mb-3">Smart Notifications</h3>
          <p>Get notified about upcoming events, registration confirmations, and updates.</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Upcoming Events Preview -->
    <v-row class="my-12" v-if="upcomingEvents.length > 0">
      <v-col cols="12">
        <h2 class="text-h3 mb-6">Upcoming Events</h2>
      </v-col>
      
      <v-col
        v-for="event in upcomingEvents.slice(0, 3)"
        :key="event._id"
        cols="12"
        md="4"
      >
        <v-card class="h-100">
          <v-img
            :src="event.banner || 'https://via.placeholder.com/400x200'"
            height="200"
            cover
          ></v-img>
          <v-card-title>{{ event.title }}</v-card-title>
          <v-card-subtitle>
            <v-icon size="small">mdi-calendar</v-icon>
            {{ formatDate(event.startDate) }}
          </v-card-subtitle>
          <v-card-text>
            {{ event.description?.substring(0, 100) }}...
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" :to="`/events/${event._id}`">
              View Details
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      
      <v-col cols="12" class="text-center">
        <v-btn to="/events" size="large" variant="outlined">
          View All Events
        </v-btn>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading" class="my-12">
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

const isAuthenticated = computed(() => authStore.isAuthenticated)
const upcomingEvents = computed(() => eventStore.upcomingEvents)
const loading = computed(() => eventStore.loading)

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

onMounted(async () => {
  try {
    await eventStore.fetchEvents({ limit: 6, status: 'upcoming' })
  } catch (error) {
    console.error('Failed to fetch events:', error)
  }
})
</script>
