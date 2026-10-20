<template>
  <div>
    <PageHeader
      title="Events"
      subtitle="Create, publish, and monitor every CITAD program from draft to completion."
      icon="mdi-calendar-text-outline"
    >
      <template #actions>
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="load"
        >
          Refresh
        </v-btn>
        <v-btn color="accent" variant="flat" elevation="0" prepend-icon="mdi-plus" to="/events/new">
          New Event
        </v-btn>
      </template>
    </PageHeader>

    <v-card class="admin-card mb-4" elevation="0">
      <v-card-text class="pa-4">
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.search"
              label="Search events"
              placeholder="Title or description"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            ></v-text-field>
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="comfortable"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filters.category"
              :items="categoryOptions"
              label="Category"
              variant="outlined"
              density="comfortable"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="12" md="4" class="d-flex justify-md-end align-center ga-2">
            <v-chip variant="tonal" color="primary" size="small">
              {{ pagination.total }} event{{ pagination.total === 1 ? '' : 's' }}
            </v-chip>
            <v-btn variant="text" size="small" @click="resetFilters">Reset</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <v-card class="admin-card" elevation="0">
      <v-table v-if="loading || events.length" class="admin-table" hover>
        <thead>
          <tr>
            <th>Event</th>
            <th>Schedule</th>
            <th>Venue</th>
            <th>Category</th>
            <th>Registrations</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="index in 5" :key="index">
              <td colspan="7">
                <v-skeleton-loader type="text" class="pa-0"></v-skeleton-loader>
              </td>
            </tr>
          </template>

          <template v-else>
            <tr
              v-for="event in events"
              :key="event._id"
              class="clickable-row"
              @click="viewEvent(event)"
            >
              <td style="min-width: 240px">
                <div class="d-flex align-center ga-3">
                  <v-avatar size="42" rounded="0" color="grey-lighten-3">
                    <v-img :src="event.banner" cover></v-img>
                  </v-avatar>
                  <div style="min-width: 0">
                    <div class="event-title">{{ event.title }}</div>
                    <div class="event-meta">Hosted by {{ event.hostBy || 'CITAD' }}</div>
                  </div>
                </div>
              </td>
              <td style="min-width: 150px">
                <div class="text-body-2">{{ formatDate(event.startDate) }}</div>
                <div class="event-meta">{{ formatTime(event.startDate) }}</div>
              </td>
              <td style="min-width: 150px">
                <div class="text-body-2">{{ event.venueName }}</div>
                <div class="event-meta">{{ venueLocation(event) }}</div>
              </td>
              <td>
                <v-chip size="small" variant="tonal">{{ event.category || 'Other' }}</v-chip>
              </td>
              <td style="min-width: 140px">
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span>{{ event.registrationCount || 0 }} / {{ event.capacity || '—' }}</span>
                  <span>{{ occupancy(event) }}%</span>
                </div>
                <v-progress-linear
                  :model-value="occupancy(event)"
                  :color="occupancy(event) >= 90 ? 'warning' : 'primary'"
                  height="6"
                  rounded
                ></v-progress-linear>
              </td>
              <td>
                <StatusChip :status="event.status" />
              </td>
              <td class="text-right" @click.stop>
                <v-menu location="bottom end">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-dots-vertical"
                      variant="text"
                      size="small"
                      aria-label="Event actions"
                    ></v-btn>
                  </template>

                  <v-list density="compact" min-width="190">
                    <v-list-item
                      prepend-icon="mdi-eye-outline"
                      title="View details"
                      @click="viewEvent(event)"
                    ></v-list-item>
                    <v-list-item
                      prepend-icon="mdi-pencil-outline"
                      title="Edit event"
                      :to="`/events/${event._id}/edit`"
                    ></v-list-item>
                    <v-list-item
                      v-if="event.status === 'draft'"
                      prepend-icon="mdi-send-outline"
                      title="Publish event"
                      @click="publish(event)"
                    ></v-list-item>
                    <v-list-item
                      v-if="!['cancelled', 'completed'].includes(event.status)"
                      prepend-icon="mdi-cancel"
                      title="Cancel event"
                      @click="openCancel(event)"
                    ></v-list-item>
                    <v-divider></v-divider>
                    <v-list-item
                      prepend-icon="mdi-delete-outline"
                      title="Delete event"
                      :disabled="(event.registrationCount || 0) > 0"
                      @click="openDelete(event)"
                    ></v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
          </template>
        </tbody>
      </v-table>

      <EmptyState
        v-else
        icon="mdi-calendar-blank-outline"
        title="No events match these filters"
        message="Adjust the filters or create the first event for this period."
      >
        <template #action>
          <v-btn color="accent" variant="flat" elevation="0" to="/events/new">
            Create Event
          </v-btn>
        </template>
      </EmptyState>

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

    <ConfirmDialog
      v-model="cancelDialog.show"
      title="Cancel this event?"
      confirm-text="Cancel Event"
      color="warning"
      :loading="cancelDialog.loading"
      @confirm="confirmCancel"
    >
      <p class="mb-3">
        Registered participants will see <strong>{{ cancelDialog.event?.title }}</strong>
        as cancelled. You can add an optional reason below.
      </p>
      <v-textarea
        v-model="cancelDialog.reason"
        label="Cancellation reason"
        variant="outlined"
        rows="2"
        hide-details
      ></v-textarea>
    </ConfirmDialog>

    <ConfirmDialog
      v-model="deleteDialog.show"
      title="Delete this event?"
      confirm-text="Delete"
      color="error"
      :loading="deleteDialog.loading"
      @confirm="confirmDelete"
    >
      <strong>{{ deleteDialog.event?.title }}</strong> will be permanently
      removed. Events with registrations cannot be deleted.
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import StatusChip from '@/components/StatusChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDate, formatTime } from '@/utils/formatters'

const router = useRouter()
const { notifySuccess, notifyError } = useSnackbar()

const loading = ref(true)
const error = ref(null)
const events = ref([])
const pagination = reactive({ page: 1, total: 0, totalPages: 1 })

const filters = reactive({
  search: '',
  status: 'all',
  category: 'all',
  page: 1,
  limit: 10,
})

const statusOptions = [
  { title: 'All statuses', value: 'all' },
  { title: 'Draft', value: 'draft' },
  { title: 'Published', value: 'published' },
  { title: 'Ongoing', value: 'ongoing' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' },
]

const categoryOptions = [
  { title: 'All categories', value: 'all' },
  { title: 'Workshop', value: 'workshop' },
  { title: 'Seminar', value: 'seminar' },
  { title: 'Training', value: 'training' },
  { title: 'Conference', value: 'conference' },
  { title: 'Webinar', value: 'webinar' },
  { title: 'Other', value: 'other' },
]

const cancelDialog = reactive({
  show: false,
  event: null,
  reason: '',
  loading: false,
})

const deleteDialog = reactive({
  show: false,
  event: null,
  loading: false,
})

const occupancy = (event) => {
  if (!event.capacity) return 0
  return Math.min(100, Math.round(((event.registrationCount || 0) / event.capacity) * 100))
}

const venueLocation = (event) => {
  const venue = typeof event.venue === 'object' ? event.venue : {}
  return [venue.city, venue.state].filter(Boolean).join(', ') || 'Kano, Nigeria'
}

const viewEvent = (event) => router.push(`/events/${event._id}`)

const load = async () => {
  loading.value = true
  error.value = null

  try {
    const params = {
      page: filters.page,
      limit: filters.limit,
      sort: 'startDateTime',
    }
    if (filters.search.trim()) params.search = filters.search.trim()
    if (filters.status !== 'all') params.status = filters.status
    if (filters.category !== 'all') params.category = filters.category

    const result = await api.events.list(params)
    events.value = result.events
    pagination.page = result.pagination.page
    pagination.total = result.pagination.total
    pagination.totalPages = result.pagination.totalPages
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load events.')
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.search = ''
  filters.status = 'all'
  filters.category = 'all'
  filters.page = 1
  load()
}

let searchTimer
watch(
  () => filters.search,
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      filters.page = 1
      load()
    }, 350)
  }
)

watch(
  () => [filters.status, filters.category],
  () => {
    filters.page = 1
    load()
  }
)

const publish = async (event) => {
  try {
    await api.events.publish(event._id)
    notifySuccess(`Published “${event.title}”.`)
    load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not publish the event.'))
  }
}

const openCancel = (event) => {
  cancelDialog.event = event
  cancelDialog.reason = ''
  cancelDialog.show = true
}

const confirmCancel = async () => {
  if (!cancelDialog.event) return
  cancelDialog.loading = true

  try {
    await api.events.cancel(cancelDialog.event._id, cancelDialog.reason)
    notifySuccess('Event cancelled.')
    cancelDialog.show = false
    load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not cancel the event.'))
  } finally {
    cancelDialog.loading = false
  }
}

const openDelete = (event) => {
  deleteDialog.event = event
  deleteDialog.show = true
}

const confirmDelete = async () => {
  if (!deleteDialog.event) return
  deleteDialog.loading = true

  try {
    await api.events.remove(deleteDialog.event._id)
    notifySuccess('Event deleted.')
    deleteDialog.show = false
    load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not delete the event.'))
  } finally {
    deleteDialog.loading = false
  }
}

onMounted(load)
</script>

<style scoped>
.event-title {
  font-size: 0.84rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}

.event-meta {
  font-size: 0.7rem;
  color: var(--admin-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
