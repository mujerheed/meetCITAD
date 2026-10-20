<template>
  <div class="feedback-page">
    <v-container class="py-8" max-width="900">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-4" to="/my-events">
        Back to My Events
      </v-btn>

      <!-- Loading -->
      <v-card v-if="loading" class="pa-12 text-center" elevation="1">
        <v-progress-circular indeterminate color="primary" size="56"></v-progress-circular>
        <p class="text-body-2 text-medium-emphasis mt-4">Loading event feedback form...</p>
      </v-card>

      <!-- Error -->
      <v-card v-else-if="loadError" class="pa-8 text-center" elevation="1">
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-alert-circle-outline</v-icon>
        <h1 class="text-h6 mb-2">Unable to load this form</h1>
        <p class="text-body-2 text-medium-emphasis mb-6">{{ loadError }}</p>
        <v-btn color="primary" variant="outlined" :to="eventId ? `/events/${eventId}` : '/events'">
          Back to Event
        </v-btn>
      </v-card>

      <template v-else>
        <!-- Event summary -->
        <v-card class="mb-6 event-summary" elevation="1">
          <v-card-text class="d-flex flex-column flex-sm-row align-sm-center ga-4">
            <v-img
              :src="event?.banner"
              width="96"
              height="96"
              cover
              class="summary-image"
            ></v-img>
            <div class="flex-grow-1">
              <div class="text-caption text-medium-emphasis mb-1">Event Feedback</div>
              <h1 class="text-h6 font-weight-bold mb-1">{{ event?.title }}</h1>
              <div class="text-body-2 text-medium-emphasis">
                {{ formatDate(event?.startDate) }}
                <span v-if="event?.location"> &middot; {{ event.location }}</span>
              </div>
            </div>
            <v-chip v-if="hasAttended" color="success" variant="tonal" size="small">
              <v-icon start size="16">mdi-check-decagram</v-icon>
              Attended
            </v-chip>
          </v-card-text>
        </v-card>

        <!-- Success -->
        <v-card v-if="submitted" class="pa-10 text-center" elevation="1">
          <v-icon size="72" color="success" class="mb-4">mdi-check-circle-outline</v-icon>
          <h2 class="text-h5 font-weight-bold mb-2">Thank you for your feedback</h2>
          <p class="text-body-1 text-medium-emphasis mb-6">
            Your responses help CITAD improve future programs and events.
          </p>
          <div class="d-flex flex-column flex-sm-row justify-center ga-3">
            <v-btn color="accent" variant="flat" elevation="0" to="/my-events">
              My Events
            </v-btn>
            <v-btn color="primary" variant="outlined" to="/events">
              Browse Events
            </v-btn>
          </div>
        </v-card>

        <!-- Not attended -->
        <v-card v-else-if="!hasAttended" class="pa-8 text-center" elevation="1">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-clock-outline</v-icon>
          <h2 class="text-h6 mb-2">Feedback opens after attendance</h2>
          <p class="text-body-2 text-medium-emphasis mb-6">
            Only participants who checked in to this event can submit feedback.
            If you attended, please contact CITAD so your attendance can be confirmed.
          </p>
          <v-btn color="primary" variant="outlined" :to="`/events/${eventId}`">
            View Event
          </v-btn>
        </v-card>

        <!-- Form -->
        <v-card v-else elevation="1">
          <v-card-title class="text-h6 pa-6 pb-2">Share your experience</v-card-title>
          <v-card-subtitle class="px-6">
            This short survey takes about 2-3 minutes. Your responses are confidential.
          </v-card-subtitle>

          <v-divider class="mt-4"></v-divider>

          <v-card-text class="pa-6">
            <v-alert
              v-if="submitError"
              type="error"
              variant="tonal"
              class="mb-6"
              closable
              @click:close="submitError = null"
            >
              {{ submitError }}
            </v-alert>

            <!-- Overall rating -->
            <div class="mb-8">
              <div class="text-body-1 font-weight-medium mb-1">
                Overall experience <span class="text-error">*</span>
              </div>
              <div class="text-caption text-medium-emphasis mb-2">
                How would you rate this event overall?
              </div>
              <v-rating
                v-model="ratings.overall"
                color="accent"
                active-color="accent"
                size="large"
                hover
              ></v-rating>
            </div>

            <v-divider class="mb-8"></v-divider>

            <!-- Category ratings -->
            <div class="text-body-1 font-weight-medium mb-1">Rate the details</div>
            <div class="text-caption text-medium-emphasis mb-4">
              Optional. Leave a category unrated if it does not apply.
            </div>

            <v-row dense>
              <v-col v-for="category in categories" :key="category.key" cols="12" sm="6">
                <div class="category-row">
                  <span class="text-body-2">{{ category.label }}</span>
                  <v-rating
                    v-model="ratings[category.key]"
                    color="accent"
                    active-color="accent"
                    density="compact"
                    size="small"
                    clearable
                  ></v-rating>
                </div>
              </v-col>
            </v-row>

            <v-divider class="my-8"></v-divider>

            <!-- Recommendation -->
            <div class="mb-8">
              <div class="text-body-1 font-weight-medium mb-1">
                Would you recommend CITAD events to others? <span class="text-error">*</span>
              </div>
              <v-radio-group v-model="wouldRecommend" inline class="mt-2">
                <v-radio :value="true" label="Yes" color="primary"></v-radio>
                <v-radio :value="false" label="No" color="primary"></v-radio>
              </v-radio-group>
            </div>

            <!-- NPS -->
            <div class="mb-8">
              <div class="text-body-1 font-weight-medium mb-1">
                How likely are you to attend another CITAD event?
              </div>
              <div class="d-flex align-center ga-4">
                <span class="text-caption text-medium-emphasis">Not likely</span>
                <v-slider
                  v-model="npsScore"
                  :min="0"
                  :max="10"
                  :step="1"
                  color="primary"
                  track-color="grey-lighten-2"
                  thumb-label="always"
                  hide-details
                  class="flex-grow-1"
                ></v-slider>
                <span class="text-caption text-medium-emphasis">Very likely</span>
              </div>
            </div>

            <v-divider class="mb-8"></v-divider>

            <!-- Comments -->
            <div class="text-body-1 font-weight-medium mb-4">Your comments</div>

            <v-textarea
              v-model="comments.whatYouLiked"
              label="What did you like most?"
              variant="outlined"
              rows="3"
              maxlength="1000"
              counter
              class="mb-4"
            ></v-textarea>

            <v-textarea
              v-model="comments.whatCanBeImproved"
              label="What could be improved?"
              variant="outlined"
              rows="3"
              maxlength="1000"
              counter
              class="mb-4"
            ></v-textarea>

            <v-textarea
              v-model="comments.generalComments"
              label="Any other comments"
              variant="outlined"
              rows="2"
              maxlength="1000"
              counter
            ></v-textarea>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="pa-6">
            <v-btn variant="text" :to="`/events/${eventId}`">Cancel</v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="accent"
              variant="flat"
              elevation="0"
              size="large"
              :loading="submitting"
              :disabled="!isValid"
              @click="submit"
            >
              Submit Feedback
            </v-btn>
          </v-card-actions>
        </v-card>
      </template>
    </v-container>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import api, { getErrorMessage } from '@/api'
import { formatDate } from '@/utils/formatters'

const route = useRoute()
const eventId = route.params.id

const event = ref(null)
const loading = ref(true)
const loadError = ref(null)
const hasAttended = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const submitError = ref(null)

const ratings = reactive({
  overall: 0,
  content: 0,
  speakers: 0,
  venue: 0,
  organization: 0,
  logistics: 0,
})

const npsScore = ref(8)
const wouldRecommend = ref(null)
const comments = reactive({
  whatYouLiked: '',
  whatCanBeImproved: '',
  generalComments: '',
})

const categories = [
  { key: 'content', label: 'Content and relevance' },
  { key: 'speakers', label: 'Speakers and facilitation' },
  { key: 'venue', label: 'Venue and facilities' },
  { key: 'organization', label: 'Organisation and logistics' },
  { key: 'logistics', label: 'Refreshments and comfort' },
]

const isValid = computed(
  () => ratings.overall > 0 && wouldRecommend.value !== null
)

const load = async () => {
  loading.value = true
  loadError.value = null

  try {
    const [eventData, statusData] = await Promise.allSettled([
      api.events.getById(eventId),
      api.events.getEventStatus(eventId),
    ])

    if (eventData.status === 'fulfilled') {
      event.value = eventData.value
    } else {
      throw eventData.reason
    }

    if (statusData.status === 'fulfilled') {
      hasAttended.value = Boolean(
        statusData.value?.attended ||
          statusData.value?.registration?.attended
      )
    }
  } catch (error) {
    loadError.value = getErrorMessage(error, 'Could not load this event.')
  } finally {
    loading.value = false
  }
}

const submit = async () => {
  if (!isValid.value) return

  submitting.value = true
  submitError.value = null

  try {
    const categoryRatings = Object.fromEntries(
      Object.entries(ratings).filter(([, value]) => Number(value) > 0)
    )

    await api.feedback.submit({
      eventId,
      ratings: categoryRatings,
      npsScore: Number(npsScore.value),
      booleanQuestions: { wouldRecommend: Boolean(wouldRecommend.value) },
      comments: {
        whatYouLiked: comments.whatYouLiked || undefined,
        whatCanBeImproved: comments.whatCanBeImproved || undefined,
        generalComments: comments.generalComments || undefined,
      },
    })

    submitted.value = true
  } catch (error) {
    submitError.value = getErrorMessage(
      error,
      'Could not submit your feedback. Please try again.'
    )
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.feedback-page {
  min-height: calc(100vh - 64px - 300px);
}

.event-summary {
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.summary-image {
  flex: 0 0 96px;
  border-radius: 3px;
}

.category-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
}

.v-theme--dark .event-summary {
  border-color: rgba(255, 255, 255, 0.08);
}
</style>
