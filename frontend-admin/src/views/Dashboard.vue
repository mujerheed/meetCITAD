<template>
  <div>
    <PageHeader
      title="Dashboard"
      subtitle="A live operational view of CITAD events, participation, certificates, and feedback."
      icon="mdi-view-dashboard-outline"
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
          Create Event
        </v-btn>
      </template>
    </PageHeader>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-5"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <v-row dense>
      <v-col cols="12" sm="6" lg="3">
        <StatCard
          label="Participants"
          :value="formatNumber(stats.users?.total)"
          :caption="`${formatNumber(stats.users?.active)} active · ${formatNumber(stats.users?.recentRegistrations)} joined in 7 days`"
          icon="mdi-account-group-outline"
          color="#0F2A44"
          :loading="loading"
        />
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <StatCard
          label="Events"
          :value="formatNumber(stats.events?.total)"
          :caption="`${formatNumber(stats.events?.upcoming)} upcoming published`"
          icon="mdi-calendar-text-outline"
          color="#C9A44C"
          :loading="loading"
        />
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <StatCard
          label="Certificates"
          :value="formatNumber(stats.certificates?.total)"
          caption="Active certificates issued"
          icon="mdi-certificate-outline"
          color="#059669"
          :loading="loading"
        />
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <StatCard
          label="Feedback"
          :value="formatNumber(stats.feedback?.total)"
          :caption="`Average rating ${analytics.feedback?.averageRating || '0.00'} / 5`"
          icon="mdi-message-text-outline"
          color="#D97706"
          :loading="loading"
        />
      </v-col>
    </v-row>

    <v-row class="mt-1" dense>
      <v-col cols="12" lg="8">
        <v-card class="admin-card" elevation="0">
          <v-card-text class="pa-5">
            <div class="d-flex align-start justify-space-between mb-4">
              <div>
                <div class="section-title">Participant growth</div>
                <div class="section-caption">New account registrations by month</div>
              </div>
              <v-chip size="small" variant="tonal" color="primary">
                {{ formatNumber(stats.users?.total) }} total
              </v-chip>
            </div>

            <div v-if="registrationTrend.length" class="trend-grid">
              <div
                v-for="item in registrationTrend"
                :key="item.key"
                class="trend-column"
                :title="`${item.label}: ${item.value}`"
              >
                <div class="text-caption font-weight-medium">{{ item.value }}</div>
                <div
                  class="trend-bar"
                  :class="{ 'trend-bar--accent': item.highlight }"
                  :style="{ height: `${item.height}%` }"
                ></div>
                <div class="trend-label">{{ item.shortLabel }}</div>
              </div>
            </div>
            <EmptyState
              v-else
              icon="mdi-chart-timeline-variant"
              title="No registration history yet"
              message="Monthly registration trends will appear as participants join."
            />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card class="admin-card h-100" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-1">Participation health</div>
            <div class="section-caption mb-6">Across all recorded events</div>

            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-body-2">Attendance rate</span>
              <span class="text-body-2 font-weight-bold">
                {{ analytics.events?.attendanceRate ?? 0 }}%
              </span>
            </div>
            <v-progress-linear
              :model-value="Number(analytics.events?.attendanceRate || 0)"
              color="primary"
              height="10"
              rounded
              class="mb-6"
            ></v-progress-linear>

            <v-row dense>
              <v-col cols="6">
                <div class="mini-metric">
                  <div class="mini-value">{{ formatNumber(analytics.events?.totalRegistrations) }}</div>
                  <div class="mini-label">Registrations</div>
                </div>
              </v-col>
              <v-col cols="6">
                <div class="mini-metric">
                  <div class="mini-value">{{ formatNumber(analytics.events?.totalAttendance) }}</div>
                  <div class="mini-label">Check-ins</div>
                </div>
              </v-col>
              <v-col cols="6" class="mt-3">
                <div class="mini-metric">
                  <div class="mini-value">{{ analytics.feedback?.averageRating || '0.00' }}</div>
                  <div class="mini-label">Avg. rating</div>
                </div>
              </v-col>
              <v-col cols="6" class="mt-3">
                <div class="mini-metric">
                  <div class="mini-value">{{ formatNumber(analytics.feedback?.totalFeedback) }}</div>
                  <div class="mini-label">Responses</div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-1" dense>
      <v-col cols="12" lg="8">
        <v-card class="admin-card" elevation="0">
          <v-card-text class="pa-5">
            <div class="d-flex align-center justify-space-between mb-3">
              <div>
                <div class="section-title">Recent events</div>
                <div class="section-caption">Latest events created in meetCITAD</div>
              </div>
              <v-btn variant="text" size="small" color="primary" to="/events">
                View all
              </v-btn>
            </div>

            <v-table density="comfortable" class="dashboard-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th class="text-right">Registered</th>
                  <th class="text-right">Attended</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="event in stats.recent?.events || []"
                  :key="event._id"
                  class="clickable-row"
                  @click="$router.push(`/events/${event._id}`)"
                >
                  <td class="font-weight-medium">{{ event.title }}</td>
                  <td class="text-medium-emphasis">{{ formatDate(event.startDateTime) }}</td>
                  <td class="text-right">{{ formatNumber(event.registrationCount) }}</td>
                  <td class="text-right">{{ formatNumber(event.attendanceCount) }}</td>
                </tr>
                <tr v-if="!(stats.recent?.events || []).length">
                  <td colspan="4" class="text-center text-medium-emphasis py-8">
                    No events have been created yet.
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card class="admin-card mb-4" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-1">Quick actions</div>
            <div class="section-caption mb-4">Common administrative tasks</div>

            <div class="quick-actions">
              <v-btn
                v-if="auth.can('create_event') || auth.isSuperAdmin"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-calendar-plus"
                block
                to="/events/new"
              >
                Create an event
              </v-btn>
              <v-btn
                variant="tonal"
                color="primary"
                prepend-icon="mdi-qrcode-scan"
                block
                to="/scanner"
              >
                Open QR scanner
              </v-btn>
              <v-btn
                v-if="auth.can('generate_certificates')"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-certificate-outline"
                block
                to="/certificates"
              >
                Generate certificates
              </v-btn>
              <v-btn
                v-if="auth.can('send_notifications')"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-bell-plus-outline"
                block
                to="/notifications"
              >
                Send a notification
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="admin-card" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-1">New participants</div>
            <div class="section-caption mb-3">Most recent account registrations</div>

            <div
              v-for="user in stats.recent?.users || []"
              :key="user._id"
              class="recent-user"
            >
              <v-avatar size="32" color="primary" class="text-on-primary font-weight-bold">
                {{ initials(user.fullname) }}
              </v-avatar>
              <div class="recent-user-info">
                <div class="recent-user-name">{{ user.fullname }}</div>
                <div class="recent-user-email">{{ user.email }}</div>
              </div>
              <div class="recent-user-time">{{ timeAgo(user.createdAt) }}</div>
            </div>

            <div
              v-if="!(stats.recent?.users || []).length"
              class="text-body-2 text-medium-emphasis py-4"
            >
              No participant accounts yet.
            </div>

            <v-btn
              v-if="auth.can('manage_users')"
              variant="text"
              size="small"
              color="primary"
              to="/users"
              class="mt-2"
            >
              View all users
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-1" dense>
      <v-col cols="12" md="6">
        <v-card class="admin-card h-100" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-1">Events by status</div>
            <div class="section-caption mb-4">Distribution of all event records</div>

            <div v-if="statusBreakdown.length" class="d-grid ga-3">
              <div v-for="item in statusBreakdown" :key="item.label">
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-body-2 text-capitalize">{{ item.label }}</span>
                  <span class="text-body-2 font-weight-medium">{{ item.value }}</span>
                </div>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :class="{ 'bar-fill--accent': item.highlight }"
                    :style="{ width: `${item.percent}%` }"
                  ></div>
                </div>
              </div>
            </div>
            <div v-else class="text-body-2 text-medium-emphasis">No event data yet.</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="admin-card h-100" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-1">Events by category</div>
            <div class="section-caption mb-4">Program mix across CITAD activities</div>

            <div v-if="categoryBreakdown.length" class="d-grid ga-3">
              <div v-for="item in categoryBreakdown" :key="item.label">
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-body-2 text-capitalize">{{ item.label }}</span>
                  <span class="text-body-2 font-weight-medium">{{ item.value }}</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: `${item.percent}%` }"></div>
                </div>
              </div>
            </div>
            <div v-else class="text-body-2 text-medium-emphasis">No event data yet.</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate, timeAgo } from '@/utils/formatters'

const auth = useAuthStore()

const loading = ref(true)
const error = ref(null)
const stats = ref({})
const analytics = ref({})

const formatNumber = (value) => Number(value || 0).toLocaleString('en-US')

const initials = (name = '') =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

const registrationTrend = computed(() => {
  const raw = analytics.value.users?.registrationTrend || []
  const items = raw.slice(-6).map((item) => {
    const key = item._id || ''
    const [year, month] = key.split('-')
    const date = new Date(Number(year), Number(month) - 1, 1)
    return {
      key,
      label: Number.isNaN(date.getTime())
        ? key
        : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      shortLabel: Number.isNaN(date.getTime())
        ? key
        : date.toLocaleDateString('en-US', { month: 'short' }),
      value: Number(item.count || 0),
      highlight: false,
    }
  })

  const max = Math.max(...items.map((item) => item.value), 1)
  const lastIndex = items.length - 1

  return items.map((item, index) => ({
    ...item,
    height: Math.max(4, Math.round((item.value / max) * 100)),
    highlight: index === lastIndex,
  }))
})

const breakdown = (items = [], highlightFirst = false) => {
  const total = items.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1
  return items
    .slice()
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
    .map((item, index) => ({
      label: item._id || 'Unspecified',
      value: Number(item.count || 0),
      percent: Math.max(2, Math.round((Number(item.count || 0) / total) * 100)),
      highlight: highlightFirst && index === 0,
    }))
}

const statusBreakdown = computed(() =>
  breakdown(analytics.value.events?.byStatus || [], true)
)

const categoryBreakdown = computed(() =>
  breakdown(analytics.value.events?.byCategory || [])
)

const load = async () => {
  loading.value = true
  error.value = null

  try {
    const [dashboardStats, systemAnalytics] = await Promise.all([
      api.admin.dashboard(),
      api.admin.analytics(),
    ])
    stats.value = dashboardStats || {}
    analytics.value = systemAnalytics || {}
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load dashboard statistics.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.mini-metric {
  border: 1px solid var(--admin-border);
  padding: 12px;
  border-radius: 4px;
}

.mini-value {
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.2;
}

.mini-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--admin-muted);
}

.dashboard-table {
  background: transparent;
}

.quick-actions {
  display: grid;
  gap: 10px;
}

.recent-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--admin-border);
}

.recent-user:last-of-type {
  border-bottom: 0;
}

.recent-user-info {
  flex-grow: 1;
  min-width: 0;
}

.recent-user-name {
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-user-email {
  font-size: 0.7rem;
  color: var(--admin-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-user-time {
  font-size: 0.68rem;
  color: var(--admin-muted);
  white-space: nowrap;
}
</style>
