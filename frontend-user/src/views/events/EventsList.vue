<template>
  <div class="events-list-page">
    <!-- Page Header -->
    <v-container class="py-8">
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 font-weight-bold mb-2" style="color: #0F2A44;">Events</h1>
          <p class="text-body-1 text-medium-emphasis">
            Browse and register for CITAD's upcoming programs, workshops, and training sessions.
          </p>
        </v-col>
      </v-row>

      <!-- Filters Section -->
      <v-row class="mt-4">
        <!-- Search Bar -->
        <v-col cols="12" md="4">
          <v-text-field
            v-model="filters.search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search events..."
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
            @input="debouncedSearch"
          ></v-text-field>
        </v-col>

        <!-- Category Filter -->
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filters.category"
            :items="categories"
            label="Category"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          ></v-select>
        </v-col>

        <!-- Status Filter -->
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filters.status"
            :items="statusOptions"
            label="Status"
            variant="outlined"
            density="comfortable"
            hide-details
          ></v-select>
        </v-col>

        <!-- Results Count -->
        <v-col cols="12" md="2" class="d-flex align-center">
          <span class="text-body-2 text-medium-emphasis">
            {{ totalEvents }} event{{ totalEvents !== 1 ? 's' : '' }} found
          </span>
        </v-col>
      </v-row>
    </v-container>

    <v-divider></v-divider>

    <!-- Events Grid -->
    <v-container class="py-8">
      <!-- Loading State -->
      <v-row v-if="loading" class="my-12">
        <v-col cols="12" class="text-center">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <p class="text-body-2 text-medium-emphasis mt-4">Loading events...</p>
        </v-col>
      </v-row>

      <!-- Events Grid -->
      <v-row v-else-if="paginatedEvents.length > 0">
        <v-col
          v-for="event in paginatedEvents"
          :key="event._id"
          cols="12"
          sm="6"
          md="4"
        >
          <v-card class="event-card h-100" elevation="1" hover>
            <v-img
              :src="event.banner || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400'"
              height="200"
              cover
            >
              <!-- Category Badge -->
              <v-chip
                v-if="event.category"
                class="ma-2"
                color="primary"
                size="small"
                label
              >
                {{ event.category }}
              </v-chip>
            </v-img>

            <v-card-title class="text-h6 pt-4">
              {{ event.title }}
            </v-card-title>

            <v-card-subtitle class="py-2">
              <div class="d-flex align-center mb-1">
                <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                <span class="text-caption">
                  {{ formatDate(event.startDate) }} | {{ formatTime(event.startTime) }}
                </span>
              </div>
              <div class="d-flex align-center">
                <v-icon size="small" class="mr-1">mdi-map-marker</v-icon>
                <span class="text-caption">{{ event.location || 'CITAD Center, Kano' }}</span>
              </div>
            </v-card-subtitle>

            <v-card-text class="text-body-2">
              {{ truncateText(event.description, 100) }}
            </v-card-text>

            <v-card-actions class="px-4 pb-4">
              <v-btn
                color="primary"
                variant="outlined"
                :to="`/events/${event._id}`"
                block
              >
                View Details
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-else class="my-12">
        <v-col cols="12" class="text-center">
          <v-icon size="80" color="grey-lighten-1" class="mb-4">
            mdi-calendar-blank-outline
          </v-icon>
          <h3 class="text-h6 text-medium-emphasis mb-2">No events found</h3>
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ getEmptyStateMessage() }}
          </p>
          <v-btn
            v-if="hasActiveFilters"
            color="primary"
            variant="outlined"
            @click="clearFilters"
          >
            Clear Filters
          </v-btn>
        </v-col>
      </v-row>

      <!-- Pagination -->
      <v-row v-if="totalPages > 1" class="mt-8">
        <v-col cols="12" class="d-flex justify-center">
          <v-pagination
            v-model="currentPage"
            :length="totalPages"
            :total-visible="7"
            color="primary"
            @update:model-value="scrollToTop"
          ></v-pagination>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useEventStore } from '@/stores/event'
import { storeToRefs } from 'pinia'
import { formatDate, formatTime, truncate } from '@/utils/formatters'

const eventStore = useEventStore()
const { events, loading } = storeToRefs(eventStore)

// Filters
const filters = ref({
  search: '',
  category: null,
  status: 'upcoming'
})

const categories = ref([
  'Workshop',
  'Training',
  'Seminar',
  'Conference',
  'Webinar',
  'Community Meetup',
  'Other'
])

const statusOptions = ref([
  { title: 'Upcoming Events', value: 'upcoming' },
  { title: 'Past Events', value: 'past' },
  { title: 'All Events', value: 'all' }
])

// Pagination
const currentPage = ref(1)
const itemsPerPage = 12

// Computed Properties
const filteredEvents = computed(() => {
  let filtered = [...events.value]

  // Search filter
  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    filtered = filtered.filter(event =>
      event.title.toLowerCase().includes(searchLower) ||
      event.description?.toLowerCase().includes(searchLower)
    )
  }

  // Category filter
  if (filters.value.category) {
    filtered = filtered.filter(event => event.category === filters.value.category)
  }

  // Status filter
  if (filters.value.status === 'upcoming') {
    filtered = filtered.filter(event => new Date(event.startDate) >= new Date())
  } else if (filters.value.status === 'past') {
    filtered = filtered.filter(event => new Date(event.startDate) < new Date())
  }

  // Sort by date (upcoming: ascending, past: descending)
  filtered.sort((a, b) => {
    const dateA = new Date(a.startDate)
    const dateB = new Date(b.startDate)
    return filters.value.status === 'past' ? dateB - dateA : dateA - dateB
  })

  return filtered
})

const totalEvents = computed(() => filteredEvents.value.length)

const totalPages = computed(() => Math.ceil(totalEvents.value / itemsPerPage))

const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredEvents.value.slice(start, end)
})

const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.category || filters.value.status !== 'upcoming'
})

// Methods
const truncateText = truncate

const getEmptyStateMessage = () => {
  if (filters.value.search) {
    return `No events match "${filters.value.search}". Try a different search term.`
  }
  if (filters.value.category) {
    return `No ${filters.value.category.toLowerCase()} events found. Try a different category.`
  }
  if (filters.value.status === 'upcoming') {
    return 'No upcoming events at the moment. Check back soon for new programs.'
  }
  if (filters.value.status === 'past') {
    return 'No past events found.'
  }
  return 'No events available at the moment.'
}

const clearFilters = () => {
  filters.value.search = ''
  filters.value.category = null
  filters.value.status = 'upcoming'
  currentPage.value = 1
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Debounced search
let searchTimeout = null
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1 // Reset to first page on search
  }, 300)
}

// Watch for filter changes and reset pagination
watch(() => [filters.value.category, filters.value.status], () => {
  currentPage.value = 1
})

// Lifecycle
onMounted(async () => {
  if (events.value.length === 0) {
    await eventStore.fetchEvents()
  }
})
</script>

<style scoped>
.events-list-page {
  min-height: calc(100vh - 64px - 300px); /* viewport - header - footer */
}

.event-card {
  transition: all 0.2s ease-in-out;
  border-radius: 8px;
  overflow: hidden;
}

.event-card:hover {
  transform: translateY(-4px);
}

/* Ensure cards have equal height */
.event-card {
  display: flex;
  flex-direction: column;
}

.v-card-text {
  flex-grow: 1;
}

/* Mobile adjustments */
@media (max-width: 960px) {
  .events-list-page .v-col {
    padding: 8px;
  }
}
</style>
