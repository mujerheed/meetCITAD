<template>
  <div>
    <PageHeader
      title="Feedback"
      subtitle="Review participant experience, identify improvement themes, and respond to feedback."
      icon="mdi-message-text-outline"
    >
      <template #actions>
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-download"
          :loading="exporting"
          :disabled="!filters.eventId"
          @click="exportFeedback"
        >
          Export CSV
        </v-btn>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="load">
          Refresh
        </v-btn>
      </template>
    </PageHeader>

    <v-card class="admin-card mb-4" elevation="0">
      <v-card-text class="pa-4">
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-select
              v-model="filters.eventId"
              :items="eventOptions"
              label="Event"
              variant="outlined"
              density="comfortable"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filters.rating"
              :items="ratingOptions"
              label="Rating"
              variant="outlined"
              density="comfortable"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filters.flagged"
              :items="flagOptions"
              label="Flags"
              variant="outlined"
              density="comfortable"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filters.hasResponse"
              :items="responseOptions"
              label="Response"
              variant="outlined"
              density="comfortable"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="6" md="2" class="d-flex justify-md-end">
            <v-chip variant="tonal" color="primary" size="small">
              {{ pagination.total }} response{{ pagination.total === 1 ? '' : 's' }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <v-row dense class="mb-4">
      <v-col cols="6" md="3">
        <StatCard label="Responses" :value="formatNumber(analytics.totalFeedback)" caption="For the selected event" icon="mdi-message-text-outline" color="#0F2A44" :loading="analyticsLoading" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="Average rating" :value="Number(analytics.averageRating || 0).toFixed(2)" caption="Out of 5 stars" icon="mdi-star-outline" color="#C9A44C" :loading="analyticsLoading" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="NPS score" :value="Number(analytics.npsScore || 0).toFixed(0)" caption="Net promoter score" icon="mdi-chart-line" color="#059669" :loading="analyticsLoading" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="Response rate" :value="`${analytics.responseRate || 0}%`" caption="Attendees who responded" icon="mdi-percent-outline" color="#D97706" :loading="analyticsLoading" />
      </v-col>
    </v-row>

    <v-row dense class="mb-4">
      <v-col cols="12" md="7">
        <v-card class="admin-card h-100" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-1">Rating distribution</div>
            <div class="section-caption mb-4">Overall event rating from participant responses.</div>

            <div v-for="rating in [5, 4, 3, 2, 1]" :key="rating" class="rating-row">
              <span class="rating-label">{{ rating }} star</span>
              <div class="bar-track flex-grow-1">
                <div class="bar-fill bar-fill--accent" :style="{ width: `${ratingPercent(rating)}%` }"></div>
              </div>
              <span class="rating-count">{{ analytics.ratingDistribution?.[rating] || 0 }}</span>
            </div>

            <div v-if="!analytics.totalFeedback" class="text-body-2 text-medium-emphasis mt-2">
              No feedback responses for this event yet.
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card class="admin-card h-100" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-1">Experience signals</div>
            <div class="section-caption mb-4">How participants experienced the event.</div>

            <div class="signal-row">
              <span>Would recommend</span>
              <strong>{{ analytics.recommendationRate || 0 }}%</strong>
            </div>
            <div class="signal-row">
              <span>Venue rating</span>
              <strong>{{ Number(analytics.averageVenueRating || 0).toFixed(2) }} / 5</strong>
            </div>
            <div class="signal-row">
              <span>Organisation rating</span>
              <strong>{{ Number(analytics.averageOrganizationRating || 0).toFixed(2) }} / 5</strong>
            </div>
            <div class="signal-row">
              <span>Improvement suggestions</span>
              <strong>{{ analytics.suggestionsCount || 0 }}</strong>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="admin-card" elevation="0">
      <v-table v-if="loading || feedback.length" class="admin-table">
        <thead>
          <tr>
            <th>Participant</th>
            <th>Rating</th>
            <th>Feedback</th>
            <th>Submitted</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="index in 5" :key="index">
              <td colspan="6"><v-skeleton-loader type="text" class="pa-0"></v-skeleton-loader></td>
            </tr>
          </template>

          <template v-else>
            <tr v-for="item in feedback" :key="item._id">
              <td style="min-width: 180px">
                <div class="font-weight-medium">{{ item.userId?.fullname || 'Anonymous' }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.userId?.email || 'No email' }}</div>
              </td>
              <td style="min-width: 130px">
                <v-rating :model-value="item.ratings?.overall || 0" readonly density="compact" size="small" color="accent"></v-rating>
                <div class="text-caption text-medium-emphasis">NPS {{ item.npsScore ?? '—' }}</div>
              </td>
              <td style="max-width: 400px">
                <div v-if="item.comments?.whatYouLiked" class="feedback-block">
                  <span class="feedback-label">Liked</span>
                  {{ item.comments.whatYouLiked }}
                </div>
                <div v-if="item.comments?.whatCanBeImproved" class="feedback-block">
                  <span class="feedback-label">Improve</span>
                  {{ item.comments.whatCanBeImproved }}
                </div>
                <div v-if="item.comments?.generalComments" class="feedback-block">
                  <span class="feedback-label">General</span>
                  {{ item.comments.generalComments }}
                </div>
                <div v-if="item.response?.message" class="response-block">
                  <v-icon size="14">mdi-reply-outline</v-icon>
                  {{ item.response.message }}
                </div>
                <span
                  v-if="!item.comments?.whatYouLiked && !item.comments?.whatCanBeImproved && !item.comments?.generalComments"
                  class="text-caption text-medium-emphasis"
                >
                  No written comments
                </span>
              </td>
              <td style="min-width: 120px">{{ formatDate(item.createdAt) }}</td>
              <td>
                <div class="d-flex flex-column ga-1">
                  <v-chip
                    size="x-small"
                    :color="item.booleanQuestions?.wouldRecommend ? 'success' : 'grey'"
                    variant="tonal"
                  >
                    {{ item.booleanQuestions?.wouldRecommend ? 'Recommends' : 'Does not recommend' }}
                  </v-chip>
                  <v-chip v-if="item.isFlagged" size="x-small" color="warning" variant="tonal" prepend-icon="mdi-flag">
                    Flagged
                  </v-chip>
                  <v-chip v-if="item.response?.message" size="x-small" color="info" variant="tonal" prepend-icon="mdi-reply">
                    Responded
                  </v-chip>
                </div>
              </td>
              <td class="text-right">
                <v-btn icon="mdi-reply-outline" variant="text" size="small" aria-label="Respond to feedback" @click="openDialog(item, 'respond')"></v-btn>
                <v-btn
                  icon="mdi-flag-outline"
                  variant="text"
                  size="small"
                  :color="item.isFlagged ? 'warning' : undefined"
                  aria-label="Flag feedback"
                  @click="openDialog(item, 'flag')"
                ></v-btn>
                <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" aria-label="Delete feedback" @click="openDelete(item)"></v-btn>
              </td>
            </tr>
          </template>
        </tbody>
      </v-table>

      <EmptyState
        v-else
        icon="mdi-message-text-outline"
        title="No feedback found"
        message="Feedback appears after attendees submit their event survey."
      />

      <v-divider v-if="pagination.totalPages > 1"></v-divider>
      <div v-if="pagination.totalPages > 1" class="d-flex justify-center py-4">
        <v-pagination
          v-model="filters.page"
          :length="pagination.totalPages"
          :total-visible="6"
          density="comfortable"
          @update:model-value="load"
        ></v-pagination>
      </div>
    </v-card>

    <!-- Respond / flag dialog -->
    <v-dialog v-model="actionDialog.show" max-width="520" persistent>
      <v-card class="admin-card" elevation="0">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-5 px-6">
          {{ actionDialog.mode === 'respond' ? 'Respond to feedback' : 'Flag feedback' }}
        </v-card-title>
        <v-card-text class="px-6">
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ actionDialog.mode === 'respond'
              ? 'The participant will see this response alongside their feedback.'
              : 'Flagging marks this response for internal review. Add a reason.' }}
          </p>
          <v-textarea
            v-model="actionDialog.message"
            :label="actionDialog.mode === 'respond' ? 'Response message' : 'Reason for flagging'"
            variant="outlined"
            rows="4"
            hide-details
          ></v-textarea>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="actionDialog.show = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="actionDialog.loading" @click="submitAction">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="deleteDialog.show"
      title="Delete this feedback?"
      confirm-text="Delete"
      color="error"
      :loading="deleteDialog.loading"
      @confirm="confirmDelete"
    >
      This feedback response will be permanently deleted and the event rating recalculated.
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDate } from '@/utils/formatters'
import { downloadCsv, filenameTimestamp, slug } from '@/utils/download'

const { notifySuccess, notifyError } = useSnackbar()

const loading = ref(true)
const analyticsLoading = ref(true)
const exporting = ref(false)
const error = ref(null)
const events = ref([])
const feedback = ref([])
const analytics = ref({})
const pagination = reactive({ total: 0, totalPages: 1 })

const filters = reactive({
  eventId: null,
  rating: 'all',
  flagged: 'all',
  hasResponse: 'all',
  page: 1,
  limit: 20,
})

const ratingOptions = [
  { title: 'All ratings', value: 'all' },
  { title: '5 stars', value: 5 },
  { title: '4 stars', value: 4 },
  { title: '3 stars', value: 3 },
  { title: '2 stars', value: 2 },
  { title: '1 star', value: 1 },
]

const flagOptions = [
  { title: 'All feedback', value: 'all' },
  { title: 'Flagged only', value: true },
  { title: 'Not flagged', value: false },
]

const responseOptions = [
  { title: 'Any response state', value: 'all' },
  { title: 'Responded', value: true },
  { title: 'Not responded', value: false },
]

const actionDialog = reactive({
  show: false,
  mode: 'respond',
  item: null,
  message: '',
  loading: false,
})

const deleteDialog = reactive({ show: false, item: null, loading: false })

const formatNumber = (value) => Number(value || 0).toLocaleString('en-US')

const eventOptions = computed(() =>
  events.value.map((event) => ({
    title: `${event.title} — ${formatDate(event.startDate)}`,
    value: event._id,
  }))
)

const selectedEvent = computed(() =>
  events.value.find((event) => event._id === filters.eventId)
)

const ratingPercent = (rating) => {
  const total = Number(analytics.value.totalFeedback || 0)
  if (!total) return 0
  const count = Number(analytics.value.ratingDistribution?.[rating] || 0)
  if (!count) return 0
  return Math.max(2, Math.round((count / total) * 100))
}

const loadEvents = async () => {
  try {
    const result = await api.events.list({ limit: 100, sort: '-startDateTime' })
    events.value = result.events || []
    if (!filters.eventId && events.value.length) {
      filters.eventId = events.value[0]._id
    }
  } catch {
    // The page still supports current feedback without an event filter.
  }
}

const loadAnalytics = async () => {
  if (!filters.eventId) {
    analytics.value = {}
    analyticsLoading.value = false
    return
  }

  analyticsLoading.value = true
  try {
    analytics.value = await api.feedback.analytics(filters.eventId)
  } catch {
    analytics.value = {}
  } finally {
    analyticsLoading.value = false
  }
}

const load = async () => {
  loading.value = true
  error.value = null

  try {
    const params = { page: filters.page, limit: filters.limit }
    if (filters.eventId) params.eventId = filters.eventId
    if (filters.rating !== 'all') params.rating = filters.rating
    if (filters.flagged !== 'all') params.flagged = filters.flagged
    if (filters.hasResponse !== 'all') params.hasResponse = filters.hasResponse

    const result = await api.feedback.list(params)
    feedback.value = result.feedback || []
    pagination.total = result.pagination.total
    pagination.totalPages = result.pagination.totalPages
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load feedback.')
  } finally {
    loading.value = false
  }
}

watch(
  () => [filters.eventId, filters.rating, filters.flagged, filters.hasResponse],
  () => {
    filters.page = 1
    load()
    loadAnalytics()
  }
)

const openDialog = (item, mode) => {
  actionDialog.item = item
  actionDialog.mode = mode
  actionDialog.message = mode === 'respond' ? item.response?.message || '' : item.flagReason || ''
  actionDialog.show = true
}

const submitAction = async () => {
  if (!actionDialog.item) return
  if (!actionDialog.message.trim()) {
    notifyError('Enter a message first.')
    return
  }

  actionDialog.loading = true
  try {
    const updated =
      actionDialog.mode === 'respond'
        ? await api.feedback.respond(actionDialog.item._id, actionDialog.message.trim())
        : await api.feedback.flag(actionDialog.item._id, actionDialog.message.trim())

    const previous = feedback.value.find((item) => item._id === actionDialog.item._id)
    if (previous && updated) {
      feedback.value[feedback.value.indexOf(previous)] = {
        ...previous,
        ...updated,
        userId: previous.userId,
        eventId: previous.eventId,
      }
    }
    actionDialog.show = false
    notifySuccess(actionDialog.mode === 'respond' ? 'Response saved.' : 'Feedback flagged.')
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not save the feedback action.'))
  } finally {
    actionDialog.loading = false
  }
}

const openDelete = (item) => {
  deleteDialog.item = item
  deleteDialog.show = true
}

const confirmDelete = async () => {
  if (!deleteDialog.item) return
  deleteDialog.loading = true
  try {
    await api.feedback.remove(deleteDialog.item._id)
    notifySuccess('Feedback deleted.')
    deleteDialog.show = false
    await load()
    await loadAnalytics()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not delete the feedback.'))
  } finally {
    deleteDialog.loading = false
  }
}

const exportFeedback = async () => {
  if (!filters.eventId) return
  exporting.value = true

  try {
    const data = await api.feedback.export(filters.eventId)
    downloadCsv(
      `feedback-${slug(selectedEvent.value?.title || filters.eventId)}-${filenameTimestamp()}.csv`,
      [
        { label: 'Participant', value: (row) => row.userId?.fullname || 'Anonymous' },
        { label: 'Email', value: (row) => row.userId?.email || '' },
        { label: 'Overall rating', value: (row) => row.ratings?.overall || '' },
        { label: 'Content rating', value: (row) => row.ratings?.content || '' },
        { label: 'Speakers rating', value: (row) => row.ratings?.speakers || '' },
        { label: 'Venue rating', value: (row) => row.ratings?.venue || '' },
        { label: 'Organization rating', value: (row) => row.ratings?.organization || '' },
        { label: 'NPS', value: (row) => row.npsScore ?? '' },
        { label: 'Would recommend', value: (row) => (row.booleanQuestions?.wouldRecommend ? 'Yes' : 'No') },
        { label: 'Liked', value: (row) => row.comments?.whatYouLiked || '' },
        { label: 'Improve', value: (row) => row.comments?.whatCanBeImproved || '' },
        { label: 'General comments', value: (row) => row.comments?.generalComments || '' },
        { label: 'Admin response', value: (row) => row.response?.message || '' },
        { label: 'Submitted', value: (row) => formatDate(row.createdAt) },
        { label: 'Flagged', value: (row) => (row.isFlagged ? 'Yes' : 'No') },
      ],
      data.feedback || []
    )
    notifySuccess('Feedback exported.')
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not export feedback.'))
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  await loadEvents()
  await Promise.all([load(), loadAnalytics()])
})
</script>

<style scoped>
.rating-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 7px;
}

.rating-label {
  width: 48px;
  font-size: 0.74rem;
  color: var(--admin-muted);
}

.rating-count {
  width: 28px;
  text-align: right;
  font-size: 0.74rem;
  font-weight: 600;
}

.signal-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 9px 0;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--admin-border);
}

.signal-row:last-child {
  border-bottom: 0;
}

.signal-row span {
  color: var(--admin-muted);
}

.feedback-block {
  font-size: 0.76rem;
  line-height: 1.5;
  margin-bottom: 4px;
}

.feedback-label {
  display: inline-block;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: var(--admin-muted);
  margin-right: 5px;
}

.response-block {
  font-size: 0.74rem;
  color: rgb(var(--v-theme-primary));
  background: rgba(15, 42, 68, 0.05);
  padding: 4px 8px;
  border-radius: 3px;
  margin-top: 5px;
  display: flex;
  gap: 4px;
  align-items: flex-start;
}

.v-theme--dark .response-block {
  color: #e9d7a7;
  background: rgba(201, 164, 76, 0.1);
}
</style>
