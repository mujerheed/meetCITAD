<template>
  <div>
    <PageHeader
      title="Weekly Programs"
      subtitle="Plan, publish, preview and share the CITAD weekly programme from one schedule."
      icon="mdi-calendar-week-outline"
    >
      <template #actions>
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="load()"
        >
          Refresh
        </v-btn>
        <v-btn
          v-if="program && canManage"
          variant="outlined"
          color="primary"
          prepend-icon="mdi-link-variant"
          @click="openAddEvent"
        >
          Link event
        </v-btn>
        <v-btn
          v-if="program && canManage"
          color="accent"
          variant="flat"
          elevation="0"
          prepend-icon="mdi-plus"
          @click="openAddActivity"
        >
          Add activity
        </v-btn>
        <v-btn
          v-if="program"
          variant="outlined"
          prepend-icon="mdi-eye-outline"
          @click="previewOpen = true"
        >
          Preview
        </v-btn>
        <v-btn
          v-if="program"
          variant="outlined"
          prepend-icon="mdi-text-box-outline"
          @click="summaryOpen = true"
        >
          Summary
        </v-btn>
        <v-btn
          v-if="program && canPublish && program.status === 'published'"
          variant="outlined"
          prepend-icon="mdi-bell-outline"
          @click="notifyOpen = true"
        >
          Notify
        </v-btn>
        <v-btn
          v-if="!program && canManage"
          color="accent"
          variant="flat"
          elevation="0"
          prepend-icon="mdi-calendar-plus"
          @click="openCreate"
        >
          Create week
        </v-btn>
        <v-menu v-if="program" location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon="mdi-dots-vertical"
              variant="text"
              aria-label="More weekly program actions"
            ></v-btn>
          </template>
          <v-list density="compact" min-width="230">
            <v-list-item
              v-if="canPublish && program.status === 'draft'"
              prepend-icon="mdi-send-outline"
              title="Publish week"
              @click="askPublish"
            ></v-list-item>
            <v-list-item
              v-if="canPublish && program.status === 'published'"
              prepend-icon="mdi-eye-off-outline"
              title="Unpublish week"
              @click="askUnpublish"
            ></v-list-item>
            <v-list-item
              prepend-icon="mdi-download-outline"
              title="Download calendar (.ics)"
              @click="downloadCalendar"
            ></v-list-item>
            <v-divider></v-divider>
            <v-list-item
              v-if="canPublish && program.status !== 'archived'"
              prepend-icon="mdi-archive-outline"
              title="Archive week"
              @click="askArchive"
            ></v-list-item>
          </v-list>
        </v-menu>
      </template>
    </PageHeader>

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

    <v-card class="admin-card mb-4" elevation="0">
      <v-card-text class="pa-4">
        <v-row dense align="center">
          <v-col cols="12" md="6" class="d-flex flex-wrap align-center ga-2">
            <v-btn
              icon="mdi-chevron-left"
              variant="text"
              aria-label="Previous week"
              @click="shiftWeek(-7)"
            ></v-btn>
            <v-text-field
              v-model="picker"
              type="date"
              label="Week containing"
              variant="outlined"
              density="comfortable"
              hide-details
              style="max-width: 210px"
              @change="load(picker)"
            ></v-text-field>
            <v-btn
              icon="mdi-chevron-right"
              variant="text"
              aria-label="Next week"
              @click="shiftWeek(7)"
            ></v-btn>
            <v-btn variant="text" size="small" @click="load()">This week</v-btn>
          </v-col>
          <v-col cols="12" md="6" class="d-flex flex-wrap align-center justify-md-end ga-2">
            <v-chip v-if="schedule?.weekLabel" variant="tonal" color="primary" size="small">
              {{ schedule.weekLabel }}
            </v-chip>
            <StatusChip v-if="program" :status="program.status"></StatusChip>
            <v-chip v-if="program?.publishedAt" variant="tonal" size="small" prepend-icon="mdi-clock-outline">
              Published {{ formatDateLong(program.publishedAt) }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-skeleton-loader v-if="loading && !schedule" type="card, card"></v-skeleton-loader>

    <template v-else-if="!program">
      <v-card class="admin-card" elevation="0">
        <EmptyState
          icon="mdi-calendar-blank-outline"
          title="No weekly program for this week"
          :message="
            canManage
              ? 'Create the week, then add standalone activities or link existing events.'
              : 'There is no published weekly program for this week yet.'
          "
        >
          <template #action>
            <v-btn
              v-if="canManage"
              color="accent"
              variant="flat"
              elevation="0"
              prepend-icon="mdi-calendar-plus"
              @click="openCreate"
            >
              Create week
            </v-btn>
          </template>
        </EmptyState>
      </v-card>
    </template>

    <template v-else>
      <v-alert
        v-if="program.status === 'draft'"
        type="info"
        variant="tonal"
        class="mb-4"
        icon="mdi-pencil-outline"
      >
        This week is a draft. It is not visible to participants until it is published.
      </v-alert>
      <v-alert
        v-else-if="program.status === 'archived'"
        type="warning"
        variant="tonal"
        class="mb-4"
        icon="mdi-archive-outline"
      >
        This week is archived and cannot be published again.
      </v-alert>

      <v-row dense class="mb-2">
        <v-col cols="6" sm="3">
          <v-card class="admin-card stat-card" elevation="0">
            <v-card-text>
              <div class="stat-label">Activities</div>
              <div class="stat-value">{{ counts.total }}</div>
              <div class="stat-caption">In this week</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card class="admin-card stat-card" elevation="0">
            <v-card-text>
              <div class="stat-label">Published</div>
              <div class="stat-value">{{ counts.published }}</div>
              <div class="stat-caption">Visible when week is live</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card class="admin-card stat-card" elevation="0">
            <v-card-text>
              <div class="stat-label">Drafts</div>
              <div class="stat-value">{{ counts.draft }}</div>
              <div class="stat-caption">Needs review</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card class="admin-card stat-card" elevation="0">
            <v-card-text>
              <div class="stat-label">Multi-day</div>
              <div class="stat-value">{{ counts.multiDay }}</div>
              <div class="stat-caption">Spanning more than one day</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card class="admin-card" elevation="0">
        <v-card-title class="d-flex align-center px-5 pt-5">
          <div>
            <div class="text-subtitle-1 font-weight-bold">{{ program.title }}</div>
            <div class="section-caption">
              {{ schedule?.weekRange || schedule?.weekLabel }}
              <span v-if="program.publicContactEmail"> · {{ program.publicContactEmail }}</span>
            </div>
          </div>
          <v-spacer></v-spacer>
          <v-chip size="small" variant="tonal" color="primary">
            {{ activities.length }} visible item{{ activities.length === 1 ? '' : 's' }}
          </v-chip>
        </v-card-title>

        <v-divider class="mt-4"></v-divider>

        <v-card-text v-if="!activities.length" class="pa-0">
          <EmptyState
            icon="mdi-calendar-plus-outline"
            title="No activities in this week"
            message="Add a standalone activity, or link an existing event so its registration and attendance stay in the event system."
          >
            <template #action>
              <v-btn
                v-if="canManage"
                color="accent"
                variant="flat"
                elevation="0"
                prepend-icon="mdi-plus"
                @click="openAddActivity"
              >
                Add activity
              </v-btn>
            </template>
          </EmptyState>
        </v-card-text>

        <div v-else class="weekly-list">
          <section v-for="group in groups" :key="group.key" class="weekly-day">
            <div class="weekly-day-label">{{ group.label }}</div>

            <v-card
              v-for="activity in group.items"
              :key="activity.id"
              variant="outlined"
              class="weekly-activity"
              elevation="0"
            >
              <div class="activity-time">
                <div class="activity-time-main">
                  {{ formatTimeRange(activity.startDateTime, activity.endDateTime, activity.allDay) }}
                </div>
                <div v-if="activity.isMultiDay" class="section-caption">Multi-day</div>
              </div>

              <div class="activity-main">
                <div class="d-flex flex-wrap align-center ga-2 mb-1">
                  <strong class="activity-title">{{ activity.title }}</strong>
                  <v-chip size="x-small" variant="tonal" color="primary">
                    {{ activityTypeLabel(activity.activityType) }}
                  </v-chip>
                  <v-chip
                    v-if="activity.source === 'event'"
                    size="x-small"
                    variant="tonal"
                    color="info"
                    prepend-icon="mdi-link-variant"
                  >
                    Linked event
                  </v-chip>
                  <v-chip
                    v-if="activity.visibility !== 'public'"
                    size="x-small"
                    variant="tonal"
                    color="warning"
                  >
                    {{ visibilityLabel(activity.visibility) }}
                  </v-chip>
                  <v-chip
                    v-if="activity.status !== 'published'"
                    size="x-small"
                    variant="tonal"
                    color="grey"
                  >
                    {{ activity.status }}
                  </v-chip>
                </div>

                <div class="text-body-2 text-medium-emphasis">
                  {{ venueText(activity) }}
                </div>
                <div
                  v-if="activity.project || activity.department"
                  class="text-caption text-medium-emphasis mt-1"
                >
                  {{ [activity.project, activity.department].filter(Boolean).join(' · ') }}
                </div>
                <div v-if="activity.contact?.email" class="text-caption text-medium-emphasis mt-1">
                  Public contact: {{ activity.contact.email }}
                </div>
              </div>

              <div class="activity-actions" @click.stop>
                <v-btn
                  v-if="activity.source === 'event'"
                  :to="`/events/${activity.eventId}`"
                  icon="mdi-open-in-new"
                  variant="text"
                  size="small"
                  aria-label="Open linked event"
                ></v-btn>
                <v-btn
                  v-if="canManage"
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  aria-label="Edit activity"
                  @click="openEditActivity(activity)"
                ></v-btn>
                <v-btn
                  v-if="canManage"
                  icon="mdi-archive-outline"
                  variant="text"
                  size="small"
                  aria-label="Archive activity"
                  @click="askArchiveActivity(activity)"
                ></v-btn>
              </div>
            </v-card>
          </section>
        </div>
      </v-card>
    </template>

    <!-- Create week -->
    <v-dialog v-model="createDialog.show" max-width="560" persistent>
      <v-card class="admin-card" elevation="0">
        <v-card-title class="pt-5 px-6 text-subtitle-1 font-weight-bold">
          Create weekly program
        </v-card-title>
        <v-card-text class="px-6">
          <v-text-field
            v-model="createDialog.weekStart"
            label="Any date in the week"
            type="date"
            variant="outlined"
            hint="The schedule is stored as Monday–Sunday in Africa/Lagos."
            persistent-hint
            class="mb-5"
          ></v-text-field>
          <v-text-field
            v-model="createDialog.title"
            label="Schedule title"
            variant="outlined"
            class="mb-3"
          ></v-text-field>
          <v-text-field
            v-model="createDialog.publicContactEmail"
            label="Public contact email"
            type="email"
            variant="outlined"
            hint="Used in shareable summaries when an activity has no public contact."
            persistent-hint
          ></v-text-field>
          <v-alert
            v-if="createDialog.error"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-4"
          >
            {{ createDialog.error }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-6 py-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="createDialog.saving" @click="createDialog.show = false">
            Cancel
          </v-btn>
          <v-btn
            color="accent"
            variant="flat"
            elevation="0"
            :loading="createDialog.saving"
            @click="createWeek"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add existing event -->
    <v-dialog v-model="addEventDialog.show" max-width="700" persistent>
      <v-card class="admin-card" elevation="0">
        <v-card-title class="pt-5 px-6 text-subtitle-1 font-weight-bold">
          Link an existing event
        </v-card-title>
        <v-card-text class="px-6">
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
            icon="mdi-information-outline"
          >
            The linked event remains the source of truth for registration, attendance,
            QR tickets, certificates and feedback. Weekly fields only add schedule
            visibility and internal notes.
          </v-alert>

          <v-text-field
            v-model="addEventDialog.search"
            label="Search events"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            hide-details
            class="mb-3"
            @keyup.enter="searchEvents"
          ></v-text-field>
          <div class="d-flex justify-end mb-3">
            <v-btn
              variant="text"
              size="small"
              prepend-icon="mdi-magnify"
              :loading="addEventDialog.loading"
              @click="searchEvents"
            >
              Search
            </v-btn>
          </div>

          <v-select
            v-model="addEventDialog.selected"
            :items="availableEvents"
            item-title="title"
            item-value="_id"
            label="Event"
            variant="outlined"
            :loading="addEventDialog.loading"
            no-data-text="No unlinked events found"
            class="mb-3"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :subtitle="formatDateLong(item.raw.startDate || item.raw.startDateTime)">
                <template #title>
                  <span>{{ item.raw.title }}</span>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <v-select
            v-model="addEventDialog.visibility"
            :items="VISIBILITY_OPTIONS"
            label="Visibility"
            variant="outlined"
          ></v-select>

          <v-alert
            v-if="addEventDialog.error"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ addEventDialog.error }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-6 py-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="addEventDialog.saving" @click="addEventDialog.show = false">
            Cancel
          </v-btn>
          <v-btn
            color="accent"
            variant="flat"
            elevation="0"
            :disabled="!addEventDialog.selected"
            :loading="addEventDialog.saving"
            @click="addEvent"
          >
            Link event
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <WeeklyActivityDialog
      v-model="activityDialog.show"
      :program-id="program?.id"
      :activity="activityDialog.activity"
      :week-start="selectedWeek"
      @saved="onActivitySaved"
    />

    <WeeklySummaryDialog
      v-model="summaryOpen"
      :program="program"
    />

    <WeeklyPreviewDialog
      v-model="previewOpen"
      :program="program"
    />

    <WeeklyNotifyDialog
      v-model="notifyOpen"
      :program="program"
      @sent="onNotificationSent"
    />

    <ConfirmDialog
      v-model="confirmDialog.show"
      :title="confirmDialog.title"
      :confirm-text="confirmDialog.confirmText"
      :color="confirmDialog.color"
      :loading="confirmDialog.loading"
      @confirm="runConfirm"
    >
      <span v-html="confirmDialog.message"></span>
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/composables/useSnackbar'
import { downloadBlob } from '@/utils/download'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusChip from '@/components/StatusChip.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import WeeklyActivityDialog from './WeeklyActivityDialog.vue'
import WeeklySummaryDialog from './WeeklySummaryDialog.vue'
import WeeklyPreviewDialog from './WeeklyPreviewDialog.vue'
import WeeklyNotifyDialog from './WeeklyNotifyDialog.vue'
import {
  VISIBILITY_OPTIONS,
  activityTypeLabel,
  formatDateLong,
  formatDayLabel,
  formatTimeRange,
  shiftDateKey,
  summaryFilename,
  visibilityLabel,
  weekKey,
} from '@/utils/weekly'

const auth = useAuthStore()
const { notifySuccess, notifyError } = useSnackbar()

const schedule = ref(null)
const selectedWeek = ref('')
const picker = ref('')
const loading = ref(false)
const error = ref(null)

const summaryOpen = ref(false)
const previewOpen = ref(false)
const notifyOpen = ref(false)

const activityDialog = reactive({ show: false, activity: null })

const createDialog = reactive({
  show: false,
  saving: false,
  error: null,
  weekStart: '',
  title: 'CITAD Weekly Programs',
  publicContactEmail: '',
})

const addEventDialog = reactive({
  show: false,
  loading: false,
  saving: false,
  error: null,
  search: '',
  selected: null,
  visibility: 'public',
  events: [],
})

const confirmDialog = reactive({
  show: false,
  type: '',
  activityId: null,
  loading: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  color: 'primary',
})

const canManage = computed(() => auth.can('manage_weekly_programs'))
const canPublish = computed(() => auth.can('publish_weekly_programs'))
const program = computed(() => schedule.value?.program || null)
const activities = computed(() => schedule.value?.activities || [])
const counts = computed(
  () =>
    schedule.value?.counts || {
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
      multiDay: 0,
    }
)

const groups = computed(() => {
  const map = new Map()
  for (const activity of activities.value) {
    const key = activity.dayKey || 'unscheduled'
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: activity.dayKey ? formatDayLabel(activity.dayKey) : 'Unscheduled',
        items: [],
      })
    }
    map.get(key).items.push(activity)
  }
  return Array.from(map.values())
})

const linkedEventIds = computed(
  () => new Set(activities.value.map((activity) => activity.eventId).filter(Boolean))
)

const availableEvents = computed(() =>
  addEventDialog.events.filter((event) => !linkedEventIds.value.has(event._id))
)

const venueText = (activity) => {
  const venue = activity.venue || {}
  const parts = [venue.name, venue.city, venue.state].filter(Boolean)
  if (activity.mode === 'virtual') {
    return parts[0] ? `${parts[0]} · Virtual` : 'Virtual'
  }
  if (activity.mode === 'hybrid') {
    return `${parts.join(', ') || 'CITAD'} · Hybrid`
  }
  return parts.join(', ') || 'CITAD, Kano'
}

async function load(week) {
  loading.value = true
  error.value = null
  try {
    const data = await api.weeklyPrograms.week(week || selectedWeek.value || undefined)
    schedule.value = data
    const key = data.weekStart ? weekKey(data.weekStart) : week || ''
    selectedWeek.value = key
    picker.value = key
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load the weekly program.')
  } finally {
    loading.value = false
  }
}

function shiftWeek(days) {
  const base = selectedWeek.value || weekKey(new Date())
  load(shiftDateKey(base, days))
}

function openCreate() {
  createDialog.show = true
  createDialog.saving = false
  createDialog.error = null
  createDialog.weekStart = selectedWeek.value || weekKey(new Date())
  createDialog.title = 'CITAD Weekly Programs'
  createDialog.publicContactEmail = program.value?.publicContactEmail || ''
}

async function createWeek() {
  if (!createDialog.weekStart) {
    createDialog.error = 'Choose any date in the week.'
    return
  }
  createDialog.saving = true
  createDialog.error = null
  try {
    const payload = {
      weekStart: createDialog.weekStart,
      title: createDialog.title || 'CITAD Weekly Programs',
    }
    if (createDialog.publicContactEmail) {
      payload.publicContactEmail = createDialog.publicContactEmail
    }
    const data = await api.weeklyPrograms.create(payload)
    createDialog.show = false
    notifySuccess('Weekly program created as a draft.')
    await load(weekKey(data.week?.weekStart || createDialog.weekStart))
  } catch (err) {
    createDialog.error = getErrorMessage(
      err,
      'Could not create the weekly program for that week.'
    )
  } finally {
    createDialog.saving = false
  }
}

function openAddActivity() {
  activityDialog.activity = null
  activityDialog.show = true
}

function openEditActivity(activity) {
  activityDialog.activity = activity
  activityDialog.show = true
}

async function onActivitySaved() {
  await load(selectedWeek.value)
}

function askPublish() {
  confirmDialog.type = 'publish'
  confirmDialog.title = 'Publish this weekly program?'
  confirmDialog.message =
    'All non-archived activities in this week will become visible according to their visibility. No notification will be sent automatically.'
  confirmDialog.confirmText = 'Publish week'
  confirmDialog.color = 'success'
  confirmDialog.show = true
}

function askUnpublish() {
  confirmDialog.type = 'unpublish'
  confirmDialog.title = 'Unpublish this weekly program?'
  confirmDialog.message =
    'The schedule will be hidden from participants. Existing activities and their settings are kept.'
  confirmDialog.confirmText = 'Unpublish'
  confirmDialog.color = 'warning'
  confirmDialog.show = true
}

function askArchive() {
  confirmDialog.type = 'archive'
  confirmDialog.title = 'Archive this weekly program?'
  confirmDialog.message =
    'Archived weeks cannot be published again. Use archive for old schedules that should remain in the administration audit trail.'
  confirmDialog.confirmText = 'Archive week'
  confirmDialog.color = 'error'
  confirmDialog.show = true
}

function askArchiveActivity(activity) {
  confirmDialog.type = 'archiveActivity'
  confirmDialog.activityId = activity.id
  confirmDialog.title = 'Archive this activity?'
  confirmDialog.message = `<strong>${escapeHtml(activity.title)}</strong> will be removed from the weekly schedule. The linked event, if any, is not affected.`
  confirmDialog.confirmText = 'Archive activity'
  confirmDialog.color = 'error'
  confirmDialog.show = true
}

async function runConfirm() {
  if (!program.value?.id && !confirmDialog.activityId) return
  confirmDialog.loading = true
  try {
    if (confirmDialog.type === 'publish') {
      await api.weeklyPrograms.publish(program.value.id)
      notifySuccess('Weekly program published.')
    } else if (confirmDialog.type === 'unpublish') {
      await api.weeklyPrograms.unpublish(program.value.id)
      notifySuccess('Weekly program unpublished.')
    } else if (confirmDialog.type === 'archive') {
      await api.weeklyPrograms.archive(program.value.id)
      notifySuccess('Weekly program archived.')
    } else if (confirmDialog.type === 'archiveActivity') {
      await api.weeklyPrograms.archiveActivity(program.value.id, confirmDialog.activityId)
      notifySuccess('Weekly activity archived.')
    }
    confirmDialog.show = false
    confirmDialog.activityId = null
    await load(selectedWeek.value)
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not complete the action.'))
  } finally {
    confirmDialog.loading = false
  }
}

async function downloadCalendar() {
  if (!program.value?.id) return
  try {
    const response = await api.weeklyPrograms.calendar(program.value.id)
    downloadBlob(response.data, summaryFilename(program.value.weekStart, 'ics'))
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not download the calendar file.'))
  }
}

function openAddEvent() {
  addEventDialog.show = true
  addEventDialog.search = ''
  addEventDialog.selected = null
  addEventDialog.visibility = 'public'
  addEventDialog.error = null
  addEventDialog.events = []
  searchEvents()
}

async function searchEvents() {
  addEventDialog.loading = true
  addEventDialog.error = null
  try {
    const data = await api.events.list({
      page: 1,
      limit: 50,
      search: addEventDialog.search || undefined,
    })
    addEventDialog.events = data.events || []
  } catch (err) {
    addEventDialog.error = getErrorMessage(err, 'Could not load events.')
  } finally {
    addEventDialog.loading = false
  }
}

async function addEvent() {
  if (!program.value?.id || !addEventDialog.selected) return
  addEventDialog.saving = true
  addEventDialog.error = null
  try {
    await api.weeklyPrograms.addEvent(program.value.id, {
      eventId: addEventDialog.selected,
      visibility: addEventDialog.visibility,
    })
    addEventDialog.show = false
    notifySuccess('Event linked to this week.')
    await load(selectedWeek.value)
  } catch (err) {
    addEventDialog.error = getErrorMessage(err, 'Could not link the event.')
  } finally {
    addEventDialog.saving = false
  }
}

function onNotificationSent(result) {
  notifySuccess(
    `Notification batch finished: ${result.sent || 0} sent, ${result.failed || 0} failed.`
  )
  notifyOpen.value = false
  load(selectedWeek.value)
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

onMounted(() => load())
</script>

<style scoped>
.weekly-list {
  padding: 8px 20px 22px;
}

.weekly-day {
  margin-top: 16px;
}

.weekly-day-label {
  padding: 4px 2px 8px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--admin-muted);
}

.weekly-activity {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  padding: 14px 16px;
  margin-bottom: 8px;
  border-color: var(--admin-border);
}

.activity-time {
  width: 150px;
  flex-shrink: 0;
}

.activity-time-main {
  font-size: 0.8rem;
  font-weight: 650;
  color: rgb(var(--v-theme-primary));
}

.v-theme--dark .activity-time-main {
  color: #e9d7a7;
}

.activity-main {
  min-width: 0;
  flex: 1;
}

.activity-title {
  font-size: 0.92rem;
  color: rgb(var(--v-theme-on-surface));
}

.activity-actions {
  display: flex;
  flex-shrink: 0;
}

@media (max-width: 700px) {
  .weekly-activity {
    flex-direction: column;
    gap: 6px;
  }

  .activity-time {
    width: auto;
  }

  .activity-actions {
    align-self: flex-end;
  }
}
</style>
