<template>
  <div>
    <PageHeader
      title="Attendance"
      subtitle="Monitor live check-ins, reconcile attendance, and export participation records."
      icon="mdi-account-check-outline"
    >
      <template #actions>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="load">
          Refresh
        </v-btn>
        <v-btn color="accent" variant="flat" elevation="0" prepend-icon="mdi-qrcode-scan" to="/scanner">
          Open Scanner
        </v-btn>
      </template>
    </PageHeader>

    <v-card class="admin-card mb-4" elevation="0">
      <v-card-text class="pa-4">
        <v-row dense align="center">
          <v-col cols="12" md="7">
            <v-select
              v-model="selectedEventId"
              :items="eventOptions"
              :loading="eventsLoading"
              label="Select event"
              placeholder="Choose an event to manage attendance"
              variant="outlined"
              density="comfortable"
              hide-details
              item-title="title"
              item-value="value"
            ></v-select>
          </v-col>
          <v-col cols="12" md="5" class="d-flex flex-wrap align-center justify-md-end ga-2">
            <v-chip v-if="liveStats.eventTitle" variant="tonal" color="primary" size="small">
              {{ formatNumber(liveStats.totalRegistered) }} registered
            </v-chip>
            <v-chip v-if="liveStats.eventTitle" variant="tonal" color="success" size="small">
              {{ formatNumber(liveStats.totalAttended) }} checked in
            </v-chip>
            <span v-if="lastUpdated" class="text-caption text-medium-emphasis">
              Updated {{ lastUpdated }}
            </span>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <v-skeleton-loader v-if="eventsLoading" type="card, article"></v-skeleton-loader>

    <EmptyState
      v-else-if="!selectedEventId"
      icon="mdi-calendar-search-outline"
      title="Select an event"
      message="Choose an event above to monitor attendance and manage check-ins."
    >
      <template #action>
        <v-btn variant="outlined" color="primary" to="/events">Browse events</v-btn>
      </template>
    </EmptyState>

    <template v-else>
      <v-row dense class="mb-4">
        <v-col cols="6" md="3">
          <StatCard
            label="Registered"
            :value="formatNumber(liveStats.totalRegistered)"
            caption="Confirmed participants"
            icon="mdi-account-multiple-outline"
            color="#0F2A44"
            :loading="liveLoading"
          />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard
            label="Checked in"
            :value="formatNumber(liveStats.totalAttended)"
            caption="Recorded attendance"
            icon="mdi-account-check-outline"
            color="#059669"
            :loading="liveLoading"
          />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard
            label="Not yet in"
            :value="formatNumber(liveStats.totalAbsent)"
            caption="Registered but absent"
            icon="mdi-account-clock-outline"
            color="#D97706"
            :loading="liveLoading"
          />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard
            label="Attendance rate"
            :value="`${liveStats.attendanceRate ?? 0}%`"
            :caption="`${formatNumber(liveStats.capacity)} capacity`"
            icon="mdi-chart-donut"
            color="#C9A44C"
            :loading="liveLoading"
          />
        </v-col>
      </v-row>

      <v-card class="admin-card" elevation="0">
        <v-card-text class="pa-5">
          <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
            <div>
              <div class="section-title">Attendance register</div>
              <div class="section-caption">
                Manual check-ins update the event register immediately. Use the scanner for participant tickets.
              </div>
            </div>
            <v-btn variant="tonal" color="primary" size="small" prepend-icon="mdi-qrcode-scan" to="/scanner">
              Scan tickets
            </v-btn>
          </div>

          <AttendanceTable
            :key="selectedEventId"
            :event-id="selectedEventId"
            :event-title="selectedEvent?.title || liveStats.eventTitle || ''"
            @updated="onAttendanceUpdated"
          />
        </v-card-text>
      </v-card>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { getErrorMessage } from '@/api'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import AttendanceTable from '@/components/AttendanceTable.vue'
import { formatDate } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()

const events = ref([])
const eventsLoading = ref(true)
const selectedEventId = ref('')
const liveStats = ref({})
const liveLoading = ref(false)
const loading = ref(false)
const error = ref(null)
const lastUpdated = ref('')
let refreshTimer

const formatNumber = (value) => Number(value || 0).toLocaleString('en-US')

const eventOptions = computed(() =>
  events.value.map((event) => ({
    title: `${event.title} — ${formatDate(event.startDate)}`,
    value: event._id,
  }))
)

const selectedEvent = computed(() =>
  events.value.find((event) => event._id === selectedEventId.value)
)

const loadEvents = async () => {
  eventsLoading.value = true
  error.value = null

  try {
    const result = await api.events.list({ limit: 100, sort: 'startDateTime' })
    events.value = result.events || []

    const requested = typeof route.query.event === 'string' ? route.query.event : ''
    const exists = events.value.some((event) => event._id === requested)
    if (exists) {
      selectedEventId.value = requested
    } else if (!selectedEventId.value && events.value.length) {
      const now = Date.now()
      const current =
        events.value.find((event) => event.status === 'ongoing') ||
        events.value.find((event) => new Date(event.startDate).getTime() >= now) ||
        events.value[0]
      selectedEventId.value = current._id
    }
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load events.')
  } finally {
    eventsLoading.value = false
  }
}

const loadLive = async () => {
  if (!selectedEventId.value) return
  liveLoading.value = true

  try {
    liveStats.value = await api.attendance.live(selectedEventId.value)
    lastUpdated.value = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch (err) {
    if (!error.value) {
      error.value = getErrorMessage(err, 'Could not load live attendance statistics.')
    }
  } finally {
    liveLoading.value = false
  }
}

const load = async () => {
  loading.value = true
  await Promise.all([loadEvents(), loadLive()])
  loading.value = false
}

const onAttendanceUpdated = () => {
  loadLive()
}

watch(selectedEventId, async (value) => {
  if (!value) return
  await router.replace({ query: { ...route.query, event: value } })
  await loadLive()
})

onMounted(async () => {
  await loadEvents()
  await loadLive()
  refreshTimer = setInterval(loadLive, 20000)
})

onBeforeUnmount(() => {
  clearInterval(refreshTimer)
})
</script>
