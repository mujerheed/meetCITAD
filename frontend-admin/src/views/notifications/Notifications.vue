<template>
  <div>
    <PageHeader
      title="Notifications"
      subtitle="Send institutional announcements, event updates, reminders, and delivery tests."
      icon="mdi-bell-outline"
    >
      <template #actions>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-refresh" :loading="statsLoading" @click="loadStats">
          Refresh
        </v-btn>
      </template>
    </PageHeader>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <v-row dense class="mb-4">
      <v-col cols="6" md="3">
        <StatCard label="Notifications" :value="formatNumber(stats.total)" caption="All notification records" icon="mdi-bell-outline" color="#0F2A44" :loading="statsLoading" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="Unread" :value="formatNumber(stats.unread)" caption="Awaiting participant attention" icon="mdi-email-mark-as-unread" color="#D97706" :loading="statsLoading" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="Read rate" :value="`${stats.readRate || 0}%`" caption="Share of notifications read" icon="mdi-check-all" color="#059669" :loading="statsLoading" />
      </v-col>
      <v-col cols="6" md="3">
        <StatCard label="In-app sent" :value="formatNumber(stats.channelDistribution?.inApp)" caption="Delivered to notification centre" icon="mdi-cellphone-message" color="#C9A44C" :loading="statsLoading" />
      </v-col>
    </v-row>

    <v-row dense>
      <v-col cols="12" lg="7">
        <v-card class="admin-card mb-4" elevation="0">
          <v-card-text class="pa-6">
            <div class="section-title mb-1">Broadcast notification</div>
            <div class="section-caption mb-4">
              Send an announcement to all active participants or a selected group.
            </div>

            <v-radio-group v-model="broadcast.audience" inline density="compact" class="mb-3">
              <v-radio label="All active participants" value="all"></v-radio>
              <v-radio label="Selected participants" value="selected"></v-radio>
            </v-radio-group>

            <v-autocomplete
              v-if="broadcast.audience === 'selected'"
              v-model="broadcast.userIds"
              :items="userOptions"
              :loading="usersLoading"
              label="Select participants"
              variant="outlined"
              multiple
              chips
              closable-chips
              item-title="title"
              item-value="value"
              no-data-text="No active participants found"
              class="mb-3"
            ></v-autocomplete>

            <v-text-field
              v-model="broadcast.title"
              label="Notification title"
              variant="outlined"
              counter="200"
              maxlength="200"
              class="mb-3"
            ></v-text-field>

            <v-textarea
              v-model="broadcast.message"
              label="Message"
              variant="outlined"
              rows="4"
              counter="1000"
              maxlength="1000"
              class="mb-3"
            ></v-textarea>

            <v-row dense>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="broadcast.type"
                  :items="typeOptions"
                  label="Notification type"
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="broadcast.channels"
                  :items="channelOptions"
                  label="Channels"
                  variant="outlined"
                  multiple
                  chips
                  closable-chips
                ></v-select>
              </v-col>
            </v-row>

            <v-alert
              v-if="broadcastResult"
              :type="broadcastResult.failed ? 'warning' : 'success'"
              variant="tonal"
              density="comfortable"
              class="mb-4"
            >
              {{ broadcastResult.message }}
              <span v-if="broadcastResult.failed">
                {{ broadcastResult.failed }} delivery attempt(s) failed.
              </span>
            </v-alert>

            <div class="d-flex justify-end">
              <v-btn
                color="accent"
                variant="flat"
                elevation="0"
                prepend-icon="mdi-send-outline"
                :loading="broadcastLoading"
                @click="sendBroadcast"
              >
                Send broadcast
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="admin-card mb-4" elevation="0">
          <v-card-text class="pa-6">
            <div class="section-title mb-1">Event communication</div>
            <div class="section-caption mb-4">
              Message confirmed registrants for a specific event, or remind participants who have not checked in.
            </div>

            <v-select
              v-model="eventMessage.eventId"
              :items="eventOptions"
              label="Event"
              variant="outlined"
              class="mb-3"
            ></v-select>

            <v-text-field
              v-model="eventMessage.title"
              label="Title"
              variant="outlined"
              class="mb-3"
            ></v-text-field>

            <v-textarea
              v-model="eventMessage.message"
              label="Message"
              variant="outlined"
              rows="3"
              class="mb-3"
            ></v-textarea>

            <v-row dense class="mb-3">
              <v-col cols="12" sm="6">
                <v-select
                  v-model="eventMessage.type"
                  :items="eventTypeOptions"
                  label="Type"
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="eventMessage.channels"
                  :items="channelOptions"
                  label="Channels"
                  variant="outlined"
                  multiple
                  chips
                  closable-chips
                ></v-select>
              </v-col>
            </v-row>

            <div class="d-flex flex-wrap justify-end ga-2">
              <v-btn
                variant="outlined"
                color="primary"
                prepend-icon="mdi-bell-ring-outline"
                :loading="reminderLoading"
                :disabled="!eventMessage.eventId"
                @click="sendReminder"
              >
                Remind absentees
              </v-btn>
              <v-btn
                color="primary"
                variant="flat"
                elevation="0"
                prepend-icon="mdi-send-outline"
                :loading="eventMessageLoading"
                :disabled="!eventMessage.eventId"
                @click="sendEventMessage"
              >
                Send to registrants
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card class="admin-card mb-4" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-1">Message preview</div>
            <div class="section-caption mb-4">How the in-app notification will appear.</div>

            <div class="notification-preview">
              <div class="d-flex align-center ga-2 mb-2">
                <v-icon size="16" color="primary">mdi-bell-outline</v-icon>
                <span class="text-caption text-medium-emphasis text-capitalize">
                  {{ broadcast.type.replaceAll('_', ' ') }}
                </span>
              </div>
              <div class="preview-title">
                {{ broadcast.title || 'Notification title' }}
              </div>
              <div class="preview-message">
                {{ broadcast.message || 'Your notification message will appear here.' }}
              </div>
              <div class="preview-meta">
                {{ broadcast.audience === 'all' ? 'All active participants' : `${broadcast.userIds.length} selected participant(s)` }}
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="admin-card mb-4" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-1">Delivery channels</div>
            <div class="section-caption mb-4">Recorded notification deliveries.</div>

            <div class="channel-row">
              <div class="d-flex align-center ga-2">
                <v-icon size="18" color="primary">mdi-bell-outline</v-icon>
                <span>In-app</span>
              </div>
              <strong>{{ formatNumber(stats.channelDistribution?.inApp) }}</strong>
            </div>
            <div class="channel-row">
              <div class="d-flex align-center ga-2">
                <v-icon size="18" color="primary">mdi-email-outline</v-icon>
                <span>Email</span>
              </div>
              <strong>{{ formatNumber(stats.channelDistribution?.email) }}</strong>
            </div>
            <div class="channel-row">
              <div class="d-flex align-center ga-2">
                <v-icon size="18" color="primary">mdi-message-text-outline</v-icon>
                <span>SMS</span>
              </div>
              <strong>{{ formatNumber(stats.channelDistribution?.sms) }}</strong>
            </div>

            <v-alert type="info" variant="tonal" density="compact" class="mt-4">
              Email and SMS delivery require configured external providers. In-app
              delivery is always available.
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card class="admin-card mb-4" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-1">Type distribution</div>
            <div class="section-caption mb-4">Notifications by category.</div>

            <div v-if="typeBreakdown.length" class="d-grid ga-3">
              <div v-for="item in typeBreakdown" :key="item.label">
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-body-2 text-capitalize">{{ item.label }}</span>
                  <span class="text-body-2 font-weight-medium">{{ item.value }}</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: `${item.percent}%` }"></div>
                </div>
              </div>
            </div>
            <div v-else class="text-body-2 text-medium-emphasis">No notification data yet.</div>
          </v-card-text>
        </v-card>

        <v-card class="admin-card" elevation="0">
          <v-card-text class="pa-5">
            <div class="section-title mb-1">Maintenance</div>
            <div class="section-caption mb-4">Test delivery and clean up expired records.</div>

            <v-select
              v-model="testNotification.userId"
              :items="userOptions"
              label="Test recipient"
              variant="outlined"
              density="compact"
              class="mb-3"
            ></v-select>

            <div class="d-flex flex-wrap ga-2">
              <v-btn
                variant="outlined"
                color="primary"
                size="small"
                prepend-icon="mdi-send-check-outline"
                :loading="testLoading"
                :disabled="!testNotification.userId"
                @click="sendTest"
              >
                Send test
              </v-btn>
              <v-btn
                variant="outlined"
                color="warning"
                size="small"
                prepend-icon="mdi-broom"
                @click="cleanupDialog.show = true"
              >
                Clean expired
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <ConfirmDialog
      v-model="cleanupDialog.show"
      title="Clean up expired notifications?"
      confirm-text="Clean Up"
      color="warning"
      :loading="cleanupDialog.loading"
      @confirm="cleanupExpired"
    >
      Expired notification records will be removed. Active notifications are not affected.
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDate } from '@/utils/formatters'

const { notifySuccess, notifyError } = useSnackbar()

const statsLoading = ref(true)
const usersLoading = ref(true)
const broadcastLoading = ref(false)
const eventMessageLoading = ref(false)
const reminderLoading = ref(false)
const testLoading = ref(false)
const error = ref(null)
const stats = ref({})
const events = ref([])
const users = ref([])
const broadcastResult = ref(null)

const broadcast = reactive({
  audience: 'all',
  userIds: [],
  title: '',
  message: '',
  type: 'announcement',
  channels: ['in-app', 'email'],
})

const eventMessage = reactive({
  eventId: null,
  title: '',
  message: '',
  type: 'event_update',
  channels: ['in-app', 'email'],
})

const testNotification = reactive({ userId: null })

const cleanupDialog = reactive({ show: false, loading: false })

const typeOptions = [
  { title: 'Announcement', value: 'announcement' },
  { title: 'Event update', value: 'event_update' },
  { title: 'Event reminder', value: 'event_reminder' },
  { title: 'Certificate ready', value: 'certificate_ready' },
  { title: 'Feedback request', value: 'feedback_request' },
  { title: 'System', value: 'system' },
  { title: 'Promotional', value: 'promotional' },
]

const eventTypeOptions = typeOptions.filter((item) =>
  ['event_update', 'event_reminder', 'announcement'].includes(item.value)
)

const channelOptions = [
  { title: 'In-app', value: 'in-app' },
  { title: 'Email', value: 'email' },
  { title: 'SMS', value: 'sms' },
]

const formatNumber = (value) => Number(value || 0).toLocaleString('en-US')

const userOptions = computed(() =>
  users.value.map((user) => ({
    title: `${user.fullname} — ${user.email}`,
    value: user._id,
  }))
)

const eventOptions = computed(() =>
  events.value.map((event) => ({
    title: `${event.title} — ${formatDate(event.startDate)}`,
    value: event._id,
  }))
)

const typeBreakdown = computed(() => {
  const distribution = stats.value.typeDistribution || {}
  const items = Object.entries(distribution).map(([label, value]) => ({
    label,
    value: Number(value || 0),
  }))
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1

  return items
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map((item) => ({
      ...item,
      percent: Math.max(2, Math.round((item.value / total) * 100)),
    }))
})

const loadStats = async () => {
  statsLoading.value = true
  try {
    stats.value = await api.notifications.statistics()
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load notification statistics.')
  } finally {
    statsLoading.value = false
  }
}

const loadOptions = async () => {
  usersLoading.value = true
  try {
    const [userResult, eventResult] = await Promise.all([
      api.admin.users({ limit: 100, status: 'active', sort: 'fullname' }),
      api.events.list({ limit: 100, sort: '-startDateTime' }),
    ])
    users.value = userResult.users || []
    events.value = eventResult.events || []
    if (events.value.length && !eventMessage.eventId) {
      eventMessage.eventId = events.value[0]._id
    }
  } catch {
    // The compose form can still send to all active participants.
  } finally {
    usersLoading.value = false
  }
}

const validateMessage = (title, message, channels) => {
  if (!title.trim()) return 'A notification title is required.'
  if (!message.trim()) return 'A notification message is required.'
  if (!channels.length) return 'Choose at least one delivery channel.'
  return null
}

const sendBroadcast = async () => {
  broadcastResult.value = null
  const problem = validateMessage(broadcast.title, broadcast.message, broadcast.channels)
  if (problem) {
    notifyError(problem)
    return
  }

  if (broadcast.audience === 'selected' && !broadcast.userIds.length) {
    notifyError('Select at least one participant.')
    return
  }

  broadcastLoading.value = true
  try {
    const payload = {
      title: broadcast.title.trim(),
      message: broadcast.message.trim(),
      type: broadcast.type,
      channels: broadcast.channels,
    }
    if (broadcast.audience === 'selected') payload.userIds = broadcast.userIds

    const result = await api.notifications.broadcast(payload)
    broadcastResult.value = {
      message: result.message || 'Broadcast sent.',
      failed: result.totalFailed || 0,
    }
    notifySuccess(result.message || 'Broadcast sent.')
    await loadStats()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not send the broadcast.'))
  } finally {
    broadcastLoading.value = false
  }
}

const sendEventMessage = async () => {
  if (!eventMessage.eventId) {
    notifyError('Select an event first.')
    return
  }
  const problem = validateMessage(eventMessage.title, eventMessage.message, eventMessage.channels)
  if (problem) {
    notifyError(problem)
    return
  }

  eventMessageLoading.value = true
  try {
    const result = await api.notifications.sendEvent(eventMessage.eventId, {
      title: eventMessage.title.trim(),
      message: eventMessage.message.trim(),
      type: eventMessage.type,
      channels: eventMessage.channels,
    })
    notifySuccess(result.message || 'Event notification sent.')
    await loadStats()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not send the event notification.'))
  } finally {
    eventMessageLoading.value = false
  }
}

const sendReminder = async () => {
  if (!eventMessage.eventId) return
  reminderLoading.value = true
  try {
    const result = await api.notifications.sendReminder(eventMessage.eventId)
    notifySuccess(result.message || 'Reminders sent.')
    await loadStats()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not send reminders.'))
  } finally {
    reminderLoading.value = false
  }
}

const sendTest = async () => {
  if (!testNotification.userId) return
  testLoading.value = true
  try {
    const result = await api.notifications.test({
      userId: testNotification.userId,
      title: 'meetCITAD test notification',
      message: 'This is a delivery test from the meetCITAD administration portal.',
      type: 'system',
      channels: ['in-app'],
    })
    notifySuccess(result.message || 'Test notification sent.')
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not send the test notification.'))
  } finally {
    testLoading.value = false
  }
}

const cleanupExpired = async () => {
  cleanupDialog.loading = true
  try {
    const result = await api.notifications.cleanup()
    notifySuccess(result.message || 'Expired notifications cleaned up.')
    cleanupDialog.show = false
    await loadStats()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not clean up notifications.'))
  } finally {
    cleanupDialog.loading = false
  }
}

onMounted(async () => {
  await Promise.all([loadStats(), loadOptions()])
})
</script>

<style scoped>
.notification-preview {
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  padding: 14px 16px;
  background: rgba(15, 42, 68, 0.025);
}

.v-theme--dark .notification-preview {
  background: rgba(255, 255, 255, 0.025);
}

.preview-title {
  font-size: 0.9rem;
  font-weight: 650;
  margin-bottom: 4px;
}

.preview-message {
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--admin-muted);
  white-space: pre-line;
}

.preview-meta {
  margin-top: 10px;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--admin-muted);
}

.channel-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid var(--admin-border);
  font-size: 0.82rem;
}

.channel-row:last-of-type {
  border-bottom: 0;
}
</style>
