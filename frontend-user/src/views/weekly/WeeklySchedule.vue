<template>
  <div class="weekly-page">
    <section class="weekly-hero">
      <v-container class="weekly-hero-inner">
        <div class="weekly-eyebrow">CITAD Weekly</div>
        <h1 class="weekly-title">Weekly Programme</h1>
        <p class="weekly-subtitle">
          Every meeting, training, field activity and linked event for the week,
          in one schedule. Add activities to your calendar or keep a private
          checklist of your own tasks.
        </p>
        <div class="weekly-hero-actions">
          <v-btn
            v-if="schedule?.program"
            color="accent"
            variant="flat"
            prepend-icon="mdi-calendar-arrow-right"
            @click="downloadWeekCalendar"
          >
            Download calendar
          </v-btn>
          <v-btn
            v-if="!isAuthenticated"
            variant="outlined"
            class="hero-outline-btn"
            prepend-icon="mdi-account-outline"
            @click="goSignIn"
          >
            Sign in for personal tasks
          </v-btn>
        </div>
      </v-container>
    </section>

    <v-container class="weekly-content">
      <v-alert
        v-if="offline"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
        icon="mdi-wifi-off"
      >
        You are offline. Showing the last saved weekly schedule on this device.
      </v-alert>

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

      <v-card class="week-switcher" elevation="0">
        <div class="week-switcher-layout">
          <div class="week-nav-row">
            <v-btn
              icon="mdi-chevron-left"
              variant="text"
              aria-label="Previous week"
              @click="shiftWeek(-7)"
            ></v-btn>
            <div class="week-copy">
              <div class="week-label">{{ schedule?.weekLabel || 'Weekly programme' }}</div>
              <div class="week-range">{{ schedule?.weekRange || 'Loading the current week...' }}</div>
            </div>
            <v-btn
              icon="mdi-chevron-right"
              variant="text"
              aria-label="Next week"
              @click="shiftWeek(7)"
            ></v-btn>
          </div>
          <div class="week-tools">
            <v-text-field
              v-model="picker"
              type="date"
              label="Week containing"
              variant="outlined"
              density="compact"
              hide-details
              class="week-picker"
              @change="load(picker)"
            ></v-text-field>
            <v-btn variant="text" size="small" @click="goThisWeek">This week</v-btn>
          </div>
        </div>
      </v-card>

      <v-alert
        v-if="signInExcluded > 0"
        type="info"
        variant="tonal"
        class="mt-4"
        icon="mdi-lock-outline"
      >
        {{ signInExcluded }} {{ signInExcluded === 1 ? 'activity' : 'activities' }}
        in this week require a participant account.
        <template #append>
          <v-btn variant="text" size="small" color="primary" @click="goSignIn">
            Sign in
          </v-btn>
        </template>
      </v-alert>

      <v-row class="mt-4" dense>
        <v-col cols="12" lg="8">
          <v-skeleton-loader
            v-if="loading && !schedule"
            type="article, article, article"
          ></v-skeleton-loader>

          <v-card v-else-if="!schedule?.program" class="empty-week" elevation="0">
            <div class="empty-icon">
              <v-icon size="34">mdi-calendar-blank-outline</v-icon>
            </div>
            <h2>No published programme for this week</h2>
            <p>
              The weekly schedule has not been published yet. Browse events or check
              another week.
            </p>
            <div class="d-flex flex-wrap justify-center ga-2">
              <v-btn color="primary" variant="flat" to="/events">Browse events</v-btn>
              <v-btn variant="outlined" @click="goThisWeek">Current week</v-btn>
            </div>
          </v-card>

          <template v-else>
            <div
              v-if="!schedule.activities?.length"
              class="empty-week"
            >
              <div class="empty-icon">
                <v-icon size="34">mdi-calendar-check-outline</v-icon>
              </div>
              <h2>Nothing scheduled yet</h2>
              <p>
                The week is published, but there are no public activities in it.
                Please check back later.
              </p>
            </div>

            <section
              v-for="group in groups"
              :key="group.key"
              class="day-group"
            >
              <div class="day-heading">
                <span>{{ group.label }}</span>
                <span class="day-count">
                  {{ group.items.length }} item{{ group.items.length === 1 ? '' : 's' }}
                </span>
              </div>

              <v-card
                v-for="activity in group.items"
                :key="activity.id"
                class="activity-card"
                elevation="0"
                @click="openActivity(activity)"
              >
                <div class="activity-time">
                  {{ formatTimeRange(activity.startDateTime, activity.endDateTime, activity.allDay) }}
                  <span v-if="activity.isMultiDay" class="multi-day">Multi-day</span>
                </div>

                <v-img
                  v-if="activity.thumbnail || activity.bannerImage"
                  :src="mediaUrl(activity.thumbnail || activity.bannerImage)"
                  width="92"
                  height="72"
                  cover
                  class="activity-thumb"
                ></v-img>

                <div class="activity-body">
                  <div class="d-flex flex-wrap align-center ga-2 mb-1">
                    <span class="activity-title">{{ activity.title }}</span>
                    <v-chip size="x-small" variant="tonal" color="primary">
                      {{ activityTypeLabel(activity.activityType) }}
                    </v-chip>
                    <v-chip
                      v-if="activity.source === 'event'"
                      size="x-small"
                      variant="tonal"
                      color="info"
                    >
                      Event
                    </v-chip>
                  </div>
                  <div class="activity-meta">
                    <v-icon size="15">mdi-map-marker-outline</v-icon>
                    <span>{{ venueLabel(activity) }}</span>
                  </div>
                  <div v-if="activity.project || activity.department" class="activity-meta">
                    <v-icon size="15">mdi-briefcase-outline</v-icon>
                    <span>{{ [activity.project, activity.department].filter(Boolean).join(' · ') }}</span>
                  </div>
                </div>

                <div class="activity-actions" @click.stop>
                  <v-tooltip :text="taskFor(activity) ? 'Remove from my tasks' : 'Add to my tasks'">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        :icon="taskFor(activity) ? 'mdi-bookmark-check' : 'mdi-bookmark-plus-outline'"
                        :color="taskFor(activity) ? 'accent' : undefined"
                        variant="text"
                        size="small"
                        :aria-label="taskFor(activity) ? 'Remove from my tasks' : 'Add to my tasks'"
                        @click="toggleActivityTask(activity)"
                      ></v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Add to calendar">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-calendar-plus"
                        variant="text"
                        size="small"
                        aria-label="Add activity to calendar"
                        @click="downloadActivityCalendar(activity)"
                      ></v-btn>
                    </template>
                  </v-tooltip>
                  <v-btn
                    icon="mdi-chevron-right"
                    variant="text"
                    size="small"
                    aria-label="View activity details"
                    @click="openActivity(activity)"
                  ></v-btn>
                </div>
              </v-card>
            </section>
          </template>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card class="tasks-card" elevation="0">
            <div class="tasks-heading">
              <div>
                <div class="tasks-eyebrow">Personal</div>
                <h2>My week</h2>
              </div>
              <v-btn
                v-if="isAuthenticated"
                icon="mdi-plus"
                variant="text"
                size="small"
                aria-label="Add a personal task"
                @click="openTaskDialog"
              ></v-btn>
            </div>

            <div v-if="!isAuthenticated" class="tasks-signed-out">
              <v-icon size="34" color="primary">mdi-account-lock-outline</v-icon>
              <p>Sign in to save personal tasks for the week.</p>
              <v-btn color="primary" variant="flat" block @click="goSignIn">
                Sign in
              </v-btn>
            </div>

            <template v-else>
              <v-progress-linear v-if="tasksLoading" indeterminate color="primary" class="mb-2"></v-progress-linear>

              <div v-if="!tasks.length" class="tasks-empty">
                No personal tasks yet. Add a reminder from an activity or create
                your own task.
              </div>

              <div v-for="task in tasks" :key="task.id" class="task-row">
                <v-checkbox
                  :model-value="task.completed"
                  density="compact"
                  hide-details
                  color="primary"
                  @update:model-value="updateTask(task, $event)"
                >
                  <template #label>
                    <div class="task-label">
                      <span :class="{ 'task-done': task.completed }">{{ task.title }}</span>
                      <span v-if="task.activity?.startDateTime" class="task-meta">
                        {{ formatDateLong(task.activity.startDateTime) }}
                      </span>
                    </div>
                  </template>
                </v-checkbox>
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  size="x-small"
                  aria-label="Delete task"
                  @click="deleteTask(task)"
                ></v-btn>
              </div>

              <v-btn
                block
                variant="outlined"
                color="primary"
                prepend-icon="mdi-plus"
                class="mt-3"
                @click="openTaskDialog"
              >
                Add personal task
              </v-btn>
            </template>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-dialog v-model="taskDialog.show" max-width="520" persistent>
      <v-card class="task-dialog" elevation="0">
        <v-card-title class="pt-5 px-6 text-subtitle-1 font-weight-bold">
          Add personal task
        </v-card-title>
        <v-card-text class="px-6">
          <v-text-field
            v-model="taskDialog.title"
            label="Task"
            variant="outlined"
            maxlength="200"
            class="mb-3"
            @keyup.enter="saveTask"
          ></v-text-field>
          <v-textarea
            v-model="taskDialog.note"
            label="Note (optional)"
            variant="outlined"
            rows="2"
            maxlength="500"
            class="mb-3"
          ></v-textarea>
          <v-text-field
            v-model="taskDialog.dueDate"
            label="Due date (optional)"
            type="date"
            variant="outlined"
          ></v-text-field>
        </v-card-text>
        <v-card-actions class="px-6 py-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="taskDialog.saving" @click="taskDialog.show = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="taskDialog.saving"
            :disabled="!taskDialog.title.trim()"
            @click="saveTask"
          >
            Add task
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="top right">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api, { getErrorMessage } from '@/api'
import { cacheGet, cacheSet } from '@/utils/offline'
import { resolveMediaUrl } from '@/utils/normalizers'
import {
  activityTypeLabel,
  downloadBlob,
  formatDateLong,
  formatDayLabel,
  formatTimeRange,
  mondayOf,
  venueLabel,
  weekKey,
  shiftDateKey,
} from '@/utils/weekly'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const schedule = ref(null)
const selectedWeek = ref('')
const picker = ref('')
const loading = ref(false)
const offline = ref(false)
const error = ref(null)

const tasks = ref([])
const tasksLoading = ref(false)

const snackbar = reactive({ show: false, message: '', color: 'success' })

const taskDialog = reactive({
  show: false,
  saving: false,
  title: '',
  note: '',
  dueDate: '',
})

const isAuthenticated = computed(() => authStore.isAuthenticated)

const groups = computed(() => {
  const map = new Map()
  for (const activity of schedule.value?.activities || []) {
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

const signInExcluded = computed(
  () =>
    schedule.value?.excluded?.find((item) => item.reason === 'sign_in_required')
      ?.count || 0
)

const taskFor = (activity) =>
  tasks.value.find((task) => task.weeklyActivityId === activity.id)

const mediaUrl = (value) => resolveMediaUrl(value)

const showSnack = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

function normaliseWeek(value) {
  if (!value) return mondayOf(weekKey(new Date()))
  const raw = String(value)
  return mondayOf(raw.includes('T') ? weekKey(raw) : raw.slice(0, 10))
}

async function load(week = selectedWeek.value) {
  const key = normaliseWeek(week)
  selectedWeek.value = key
  picker.value = key
  loading.value = true
  offline.value = false
  error.value = null

  try {
    const data = await api.weekly.getWeek(key)
    schedule.value = data
    const actualWeek = data.weekStart ? weekKey(data.weekStart) : key
    selectedWeek.value = actualWeek
    picker.value = actualWeek
    // The cache is cleared on sign-out; it contains the participant-visible
    // schedule only and never contains personal tasks.
    cacheSet(`weekly:${actualWeek}`, data)
    if (router.currentRoute.value.query.weekStart !== actualWeek) {
      router.replace({ query: { ...router.currentRoute.value.query, weekStart: actualWeek } })
    }
    if (isAuthenticated.value) await loadTasks()
  } catch (err) {
    const cached = cacheGet(`weekly:${key}`, 30 * 24 * 60 * 60 * 1000)
    if (cached?.value) {
      schedule.value = cached.value
      offline.value = true
      if (isAuthenticated.value) await loadTasks()
    } else {
      error.value = getErrorMessage(err, 'Could not load the weekly programme.')
      schedule.value = null
    }
  } finally {
    loading.value = false
  }
}

async function loadTasks() {
  tasksLoading.value = true
  try {
    const data = await api.weekly.getTasks(selectedWeek.value)
    tasks.value = data.tasks || []
  } catch {
    // Personal tasks are a convenience; a failure must not hide the schedule.
    tasks.value = []
  } finally {
    tasksLoading.value = false
  }
}

function shiftWeek(days) {
  load(shiftDateKey(selectedWeek.value || normaliseWeek(), days))
}

function goThisWeek() {
  load(normaliseWeek())
}

function openActivity(activity) {
  router.push({ name: 'WeeklyActivityDetails', params: { id: activity.id } })
}

function goSignIn() {
  router.push({ name: 'Login', query: { redirect: route.fullPath } })
}

function openTaskDialog() {
  if (!isAuthenticated.value) {
    goSignIn()
    return
  }
  taskDialog.show = true
  taskDialog.saving = false
  taskDialog.title = ''
  taskDialog.note = ''
  taskDialog.dueDate = ''
}

async function saveTask() {
  if (!taskDialog.title.trim()) return
  taskDialog.saving = true
  try {
    const task = await api.weekly.createTask({
      weekStart: selectedWeek.value,
      title: taskDialog.title.trim(),
      note: taskDialog.note,
      dueDate: taskDialog.dueDate || null,
    })
    tasks.value.push(task)
    taskDialog.show = false
    showSnack('Personal task added.')
  } catch (err) {
    showSnack(getErrorMessage(err, 'Could not add the personal task.'), 'error')
  } finally {
    taskDialog.saving = false
  }
}

async function toggleActivityTask(activity) {
  if (!isAuthenticated.value) {
    goSignIn()
    return
  }

  const existing = taskFor(activity)
  try {
    if (existing) {
      await api.weekly.deleteTask(existing.id)
      tasks.value = tasks.value.filter((task) => task.id !== existing.id)
      showSnack('Removed from your tasks.')
    } else {
      const task = await api.weekly.createTask({ weeklyActivityId: activity.id })
      tasks.value.push(task)
      showSnack('Added to your tasks.')
    }
  } catch (err) {
    showSnack(getErrorMessage(err, 'Could not update your tasks.'), 'error')
  }
}

async function updateTask(task, completed) {
  try {
    const updated = await api.weekly.updateTask(task.id, { completed })
    const index = tasks.value.findIndex((item) => item.id === task.id)
    if (index !== -1) tasks.value[index] = updated
  } catch (err) {
    showSnack(getErrorMessage(err, 'Could not update the task.'), 'error')
  }
}

async function deleteTask(task) {
  try {
    await api.weekly.deleteTask(task.id)
    tasks.value = tasks.value.filter((item) => item.id !== task.id)
    showSnack('Task deleted.')
  } catch (err) {
    showSnack(getErrorMessage(err, 'Could not delete the task.'), 'error')
  }
}

async function downloadWeekCalendar() {
  try {
    const { blob, filename } = await api.weekly.downloadWeekCalendar(selectedWeek.value)
    downloadBlob(blob, filename)
  } catch (err) {
    showSnack(getErrorMessage(err, 'Could not download the calendar.'), 'error')
  }
}

async function downloadActivityCalendar(activity) {
  try {
    const { blob, filename } = await api.weekly.downloadActivityCalendar(activity.id)
    downloadBlob(blob, filename)
  } catch (err) {
    showSnack(getErrorMessage(err, 'Could not download the calendar.'), 'error')
  }
}

watch(
  () => route.query.weekStart,
  (value) => {
    if (value && normaliseWeek(value) !== selectedWeek.value) load(value)
  }
)

onMounted(() => {
  load(route.query.weekStart || normaliseWeek())
})
</script>

<style scoped>
.weekly-page {
  --weekly-muted: #4b5563;
  background: rgb(var(--v-theme-background));
  min-height: 70vh;
}

.v-theme--dark .weekly-page {
  --weekly-muted: #cbd5e1;
}

.weekly-hero {
  background:
    radial-gradient(circle at 82% 20%, rgba(201, 164, 76, 0.22), transparent 30%),
    linear-gradient(135deg, #0f2a44 0%, #173f66 100%);
  color: #fff;
  padding: 54px 0 48px;
}

.weekly-hero-inner {
  max-width: 1160px;
}

.weekly-eyebrow {
  color: #e9d7a7;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.weekly-title {
  color: #fff;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.1;
  margin: 6px 0 12px;
}

.weekly-subtitle {
  color: rgba(255, 255, 255, 0.76);
  max-width: 690px;
  line-height: 1.7;
  font-size: 1rem;
}

.weekly-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.hero-outline-btn {
  color: #fff !important;
  border-color: rgba(255, 255, 255, 0.5);
}

.weekly-content {
  max-width: 1160px;
  padding-top: 26px;
  padding-bottom: 64px;
}

.week-switcher {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 12px 16px;
}

.week-switcher-layout {
  display: flex;
  align-items: center;
  gap: 14px;
}

.week-nav-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.week-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.week-copy {
  min-width: 0;
}

.week-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.week-range {
  font-size: 0.76rem;
  color: var(--weekly-muted);
}

.week-picker {
  max-width: 200px;
}

.day-group {
  margin-top: 24px;
}

.day-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 2px 8px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--weekly-muted);
}

.day-count {
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--weekly-muted);
}

.activity-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 15px 16px;
  margin-bottom: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.activity-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.35);
  transform: translateY(-1px);
}

.activity-time {
  width: 132px;
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 650;
  color: rgb(var(--v-theme-primary));
}

.v-theme--dark .activity-time {
  color: #e9d7a7;
}

.multi-day {
  display: block;
  margin-top: 3px;
  font-size: 0.66rem;
  font-weight: 500;
  color: var(--weekly-muted);
}

.activity-thumb {
  border-radius: 4px;
  flex-shrink: 0;
}

.activity-body {
  min-width: 0;
  flex: 1;
}

.activity-title {
  font-size: 0.93rem;
  font-weight: 650;
  color: rgb(var(--v-theme-on-surface));
}

.activity-meta {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 0.76rem;
  line-height: 1.5;
  color: var(--weekly-muted);
}

.activity-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.empty-week,
.tasks-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 34px 24px;
  text-align: center;
}

.empty-icon {
  width: 62px;
  height: 62px;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
}

.empty-week h2 {
  font-size: 1.1rem;
  margin-bottom: 6px;
}

.empty-week p {
  max-width: 460px;
  margin: 0 auto 18px;
  color: var(--weekly-muted);
  font-size: 0.9rem;
}

.tasks-card {
  text-align: left;
  padding: 20px;
  position: sticky;
  top: 92px;
}

.tasks-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.tasks-eyebrow {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

.v-theme--dark .tasks-eyebrow {
  color: #e9d7a7;
}

.tasks-heading h2 {
  font-size: 1.1rem;
  margin-top: 2px;
}

.tasks-signed-out,
.tasks-empty {
  text-align: center;
  color: var(--weekly-muted);
  font-size: 0.84rem;
  line-height: 1.6;
}

.tasks-signed-out p {
  margin: 8px 0 16px;
}

.tasks-empty {
  padding: 14px 4px 18px;
  text-align: left;
}

.task-row {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.task-row:last-of-type {
  border-bottom: 0;
}

.task-label {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.task-done {
  text-decoration: line-through;
  opacity: 0.6;
}

.task-meta {
  font-size: 0.66rem;
  color: var(--weekly-muted);
}

.task-dialog {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 960px) {
  .tasks-card {
    position: static;
  }
}

@media (max-width: 760px) {
  .week-switcher-layout {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .week-tools {
    width: 100%;
  }

  .week-tools .week-picker {
    flex: 1;
    max-width: none;
    width: auto;
  }
}

@media (max-width: 640px) {
  .weekly-hero {
    padding: 38px 0 34px;
  }

  .activity-card {
    flex-wrap: wrap;
    gap: 8px;
  }

  .activity-time {
    width: 100%;
  }

  .activity-actions {
    margin-left: auto;
  }

  .week-picker {
    max-width: none;
    width: auto;
  }
}
</style>
