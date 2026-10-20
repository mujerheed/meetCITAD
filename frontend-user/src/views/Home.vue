<template>
  <div>
    <!-- Hero Section with Background -->
    <section class="hero-section">
      <v-container class="hero-content">
        <v-row>
          <v-col cols="12" md="7" class="d-flex align-center">
            <div>
              <h1 class="hero-title mb-4">
                Empowering communities through technology, knowledge, and civic engagement
              </h1>
              <p class="hero-subtitle mb-8">
                Register for CITAD programs, attend events, and receive verified certificates through our digital event management system.
              </p>
              <v-btn
                size="x-large"
                color="accent"
                class="px-8"
                to="/events"
                elevation="0"
              >
                View Upcoming Events
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Impact Statistics Section - Numbers Matter More Than Icons -->
    <v-container class="py-16">
      <v-row>
        <v-col cols="6" md="3" class="text-center stats-col">
          <div class="stats-icon mb-2">
            <v-icon size="32" color="accent">mdi-calendar-check</v-icon>
          </div>
          <h2 class="text-h2 font-weight-bold mb-2" style="color: #0F2A44;">305</h2>
          <p class="text-body-2 text-medium-emphasis">Events Organized</p>
        </v-col>
        <v-col cols="6" md="3" class="text-center stats-col">
          <div class="stats-icon mb-2">
            <v-icon size="32" color="accent">mdi-account-group</v-icon>
          </div>
          <h2 class="text-h2 font-weight-bold mb-2" style="color: #0F2A44;">12,400+</h2>
          <p class="text-body-2 text-medium-emphasis">Participants Engaged</p>
        </v-col>
        <v-col cols="6" md="3" class="text-center stats-col">
          <div class="stats-icon mb-2">
            <v-icon size="32" color="accent">mdi-certificate</v-icon>
          </div>
          <h2 class="text-h2 font-weight-bold mb-2" style="color: #0F2A44;">9,800</h2>
          <p class="text-body-2 text-medium-emphasis">Certificates Issued</p>
        </v-col>
        <v-col cols="6" md="3" class="text-center stats-col">
          <div class="stats-icon mb-2">
            <v-icon size="32" color="accent">mdi-school</v-icon>
          </div>
          <h2 class="text-h2 font-weight-bold mb-2" style="color: #0F2A44;">24</h2>
          <p class="text-body-2 text-medium-emphasis">Ongoing Programs</p>
        </v-col>
      </v-row>
    </v-container>

    <!-- Visual Divider - Subtle Section Separator -->
    <v-divider class="section-divider"></v-divider>

    <!-- Upcoming Events Section -->
    <v-container class="py-16">
      <v-row class="mb-8">
        <v-col cols="12" class="d-flex justify-space-between align-center">
          <h2 class="text-h4 font-weight-bold">Upcoming Events</h2>
          <v-btn 
            to="/events" 
            variant="text" 
            color="primary"
            append-icon="mdi-arrow-right"
            class="text-caption"
          >
            View All Events
          </v-btn>
        </v-col>
      </v-row>
      
      <!-- Events Grid -->
      <v-row v-if="upcomingEvents.length > 0">
        <v-col
          v-for="event in upcomingEvents.slice(0, 3)"
          :key="event._id"
          cols="12"
          md="4"
        >
          <v-card class="event-card h-100" elevation="1">
            <v-img
              :src="event.banner || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400'"
              height="200"
              cover
            ></v-img>
            <v-card-title class="text-h6 pt-4">{{ event.title }}</v-card-title>
            <v-card-subtitle class="py-2">
              <div class="d-flex align-center mb-1">
                <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                <span class="text-caption">{{ formatDate(event.startDate) }} | {{ formatTime(event.startTime) }}</span>
              </div>
              <div class="d-flex align-center">
                <v-icon size="small" class="mr-1">mdi-map-marker</v-icon>
                <span class="text-caption">{{ event.location || 'CITAD Center, Kano' }}</span>
              </div>
            </v-card-subtitle>
            <v-card-text class="text-body-2">
              {{ event.description?.substring(0, 100) }}...
            </v-card-text>
            <v-card-actions class="px-4 pb-4">
              <v-btn 
                color="accent" 
                variant="flat" 
                :to="`/events/${event._id}`"
                block
                elevation="0"
              >
                Register
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State - Placeholder -->
      <v-row v-else-if="!loading">
        <v-col cols="12" class="text-center py-12">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-calendar-blank-outline</v-icon>
          <h3 class="text-h6 text-medium-emphasis mb-2">No upcoming events at the moment</h3>
          <p class="text-body-2 text-medium-emphasis">
            Check back soon for new programs and workshops from CITAD
          </p>
        </v-col>
      </v-row>

      <!-- Loading State -->
      <v-row v-if="loading" class="my-12">
        <v-col cols="12" class="text-center">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </v-col>
      </v-row>
    </v-container>

    <!-- Visual Divider -->
    <v-divider class="section-divider"></v-divider>

    <!-- Call to Action Divider - More Subtle -->
    <v-container class="py-12">
      <v-row>
        <v-col cols="12" class="text-center">
          <v-btn 
            to="/events" 
            size="large" 
            variant="outlined" 
            color="primary"
            class="px-12"
          >
            View All Events
          </v-btn>
        </v-col>
      </v-row>
    </v-container>

    <!-- Visual Divider -->
    <v-divider class="section-divider"></v-divider>

    <!-- About CITAD Preview Section - Institutional Trust -->
    <section class="about-section">
      <v-container class="py-16">
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <h2 class="text-h4 font-weight-bold mb-6" style="color: #0F2A44;">
              About CITAD
            </h2>
            <p class="text-body-1 mb-6" style="color: #374151; line-height: 1.8;">
              The Centre for Information Technology and Development (CITAD) is a non-profit organization 
              committed to empowering communities through technology, knowledge sharing, and civic engagement. 
              We use information and communication technologies to promote transparency, accountability, 
              and sustainable development across Nigeria.
            </p>
            <v-btn 
              to="/about" 
              variant="text" 
              color="primary"
              append-icon="mdi-arrow-right"
            >
              Learn more about CITAD
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useEventStore } from '@/stores/event'

const authStore = useAuthStore()
const eventStore = useEventStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const upcomingEvents = computed(() => eventStore.upcomingEvents || [])
const loading = computed(() => eventStore.loading)

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatTime = (time) => {
  if (!time) return '10:00 AM'
  return time
}

onMounted(async () => {
  try {
    await eventStore.fetchEvents({ limit: 6, status: 'upcoming' })
  } catch (error) {
    console.error('Failed to fetch events:', error)
  }
})
</script>

<style scoped>
/* Institutional Landing Page - No Gradients, No Flashy Animations */

.hero-section {
  position: relative;
  min-height: 500px;
  /* Real event photograph blurred/muted - No gradients */
  background: linear-gradient(rgba(15, 42, 68, 0.85), rgba(15, 42, 68, 0.85)),
              url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600') center/cover;
  padding: 100px 0;
  color: white;
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.3;
  color: white;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.7;
  font-weight: 400;
}

/* Statistics Section - Numbers Matter More Than Icons */
.stats-col {
  padding: 24px 16px;
}

.stats-icon {
  opacity: 0.6;
}

/* Event Cards - Clean, Minimal Shadows (max 1px) */
.event-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: border-color 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}

.event-card:hover {
  border-color: rgba(15, 42, 68, 0.2);
}

/* Responsive Design */
@media (max-width: 960px) {
  .hero-title {
    font-size: 1.75rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .hero-section {
    min-height: 400px;
    padding: 60px 0;
  }
  
  .stats-col {
    padding: 16px 8px;
  }
}

@media (max-width: 600px) {
  .hero-title {
    font-size: 1.5rem;
  }
}

/* Dark Mode - Very Dark Neutral Background */
:deep(.v-theme--dark) .hero-section {
  background: linear-gradient(rgba(26, 29, 35, 0.9), rgba(26, 29, 35, 0.9)),
              url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600') center/cover;
}

:deep(.v-theme--dark) .event-card {
  border-color: rgba(255, 255, 255, 0.08);
}

:deep(.v-theme--dark) .event-card:hover {
  border-color: rgba(255, 255, 255, 0.16);
}

/* Section Dividers - Very Thin, Subtle */
.section-divider {
  opacity: 0.1;
  margin: 0 auto;
  max-width: 1200px;
}

/* About Section - Slight Background Tint */
.about-section {
  background-color: #FAFBFC;
}

:deep(.v-theme--dark) .about-section {
  background-color: #161820;
}
</style>
