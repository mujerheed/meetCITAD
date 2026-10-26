<template>
  <div class="activity-page">
    <v-container class="activity-container">
      <v-btn
        variant="text"
        prepend-icon="mdi-arrow-left"
        class="back-btn"
        to="/weekly"
      >
        Weekly programme
      </v-btn>

      <v-skeleton-loader v-if="loading" type="article, article"></v-skeleton-loader>

      <v-card v-else-if="notFound" class="not-found-card" elevation="0">
        <v-icon size="42" color="primary">mdi-lock-outline</v-icon>
        <h1>Activity not available</h1>
        <p>
          This activity may require a participant account, or it may no longer be
          part of the published schedule.
        </p>
        <div class="d-flex flex-wrap justify-center ga-2">
          <v-btn v-if="!isAuthenticated" color="primary" variant="flat" @click="goSignIn">
            Sign in
          </v-btn>
          <v-btn variant="outlined" to="/weekly">Back to weekly programme</v-btn>
        </div>
      </v-card>

      <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </v-alert>

      <template v-else-if="activity">
        <section class="activity-hero">
          <div class="d-flex flex-wrap align-center ga-2 mb-3">
            <v-chip size="small" variant="tonal" color="accent">
              {{ activityTypeLabel(activity.activityType) }}
            </v-chip>
            <v-chip
              v-if="activity.source === 'event'"
              size="small"
              variant="tonal"
              color="info"
              prepend-icon="mdi-link-variant"
            >
              Linked event
            </v-chip>
            <v-chip v-if="activity.isMultiDay" size="small" variant="tonal" color="primary">
              Multi-day
            </v-chip>
          </div>

          <h1 class="activity-title">{{ activity.title }}</h1>

          <div class="activity-facts">
            <div class="fact">
              <v-icon size="19">mdi-calendar-outline</v-icon>
              <div>
                <div class="fact-label">Date</div>
                <div class="fact-value">{{ formatDateLong(activity.startDateTime) }}</div>
              </div>
            </div>
            <div class="fact">
              <v-icon size="19">mdi-clock-outline</v-icon>
              <div>
                <div class="fact-label">Time</div>
                <div class="fact-value">
                  {{ formatTimeRange(activity.startDateTime, activity.endDateTime, activity.allDay) }}
                  <span class="fact-note">WAT</span>
                </div>
              </div>
            </div>
            <div class="fact">
              <v-icon size="19">mdi-map-marker-outline</v-icon>
              <div>
                <div class="fact-label">Venue</div>
                <div class="fact-value">{{ venueLabel(activity) }}</div>
              </div>
            </div>
          </div>
        </section>

        <v-row class="mt-4" dense>
          <v-col cols="12" md="8">
            <v-card class="detail-card" elevation="0">
              <v-card-title class="text-subtitle-1 font-weight-bold">About this activity</v-card-title>
              <v-card-text>
                <p v-if="activity.description" class="activity-description">
                  {{ activity.description }}
                </p>
                <p v-else class="text-medium-emphasis">
                  No description has been provided for this schedule entry.
                </p>

                <v-divider class="my-5"></v-divider>

                <div class="meta-grid">
                  <div v-if="activity.project">
                    <div class="fact-label">Project / programme</div>
                    <div class="meta-value">{{ activity.project }}</div>
                  </div>
                  <div v-if="activity.department">
                    <div class="fact-label">Department / unit</div>
                    <div class="meta-value">{{ activity.department }}</div>
                  </div>
                  <div v-if="activity.referenceCode">
                    <div class="fact-label">Reference</div>
                    <div class="meta-value">{{ activity.referenceCode }}</div>
                  </div>
                  <div v-if="activity.contact?.name || activity.contact?.email || activity.contact?.phone">
                    <div class="fact-label">Contact</div>
                    <div class="meta-value">
                      <span v-if="activity.contact.name">{{ activity.contact.name }}</span>
                      <span v-if="activity.contact.department"> · {{ activity.contact.department }}</span>
                      <div v-if="activity.contact.email">
                        <a :href="`mailto:${activity.contact.email}`">{{ activity.contact.email }}</a>
                      </div>
                      <div v-if="activity.contact.phone">{{ activity.contact.phone }}</div>
                    </div>
                  </div>
                </div>

                <v-alert
                  v-if="activity.source === 'event'"
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mt-5"
                  icon="mdi-information-outline"
                >
                  Registration, attendance, QR tickets, certificates and feedback for
                  this activity are managed through the linked event. The weekly
                  schedule does not duplicate them.
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card class="side-card mb-4" elevation="0">
              <v-card-title class="text-subtitle-1 font-weight-bold">Plan your attendance</v-card-title>
              <v-card-text>
                <v-btn
                  block
                  color="primary"
                  variant="flat"
                  prepend-icon="mdi-calendar-plus"
                  class="mb-2"
                  @click="downloadCalendar"
                >
                  Add to calendar
                </v-btn>

                <v-btn
                  v-if="googleUrl"
                  block
                  variant="outlined"
                  prepend-icon="mdi-google"
                  class="mb-2"
                  :href="googleUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Calendar
                </v-btn>

                <v-btn
                  v-if="outlookUrl"
                  block
                  variant="outlined"
                  prepend-icon="mdi-microsoft-outlook"
                  :href="outlookUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Outlook Calendar
                </v-btn>
              </v-card-text>
            </v-card>

            <v-card class="side-card mb-4" elevation="0">
              <v-card-title class="text-subtitle-1 font-weight-bold">My week</v-card-title>
              <v-card-text>
                <template v-if="!isAuthenticated">
                  <p class="side-copy">
                    Sign in to save this activity to your private weekly checklist.
                  </p>
                  <v-btn block color="primary" variant="flat" @click="goSignIn">
                    Sign in
                  </v-btn>
                </template>
                <template v-else-if="!task">
                  <p class="side-copy">
                    Keep a private reminder for this activity. Your tasks are visible
                    only to you.
                  </p>
                  <v-btn
                    block
                    color="primary"
                    variant="flat"
                    prepend-icon="mdi-bookmark-plus-outline"
                    :loading="taskSaving"
                    @click="addTask"
                  >
                    Add to my tasks
                  </v-btn>
                </template>
                <template v-else>
                  <v-checkbox
                    :model-value="task.completed"
                    label="Mark as done"
                    color="primary"
                    density="compact"
                    hide-details
                    @update:model-value="updateTask"
                  ></v-checkbox>
                  <v-btn
                    block
                    variant="outlined"
                    color="error"
                    prepend-icon="mdi-bookmark-remove-outline"
                    class="mt-3"
                    :loading="taskSaving"
                    @click="removeTask"
                  >
                    Remove from my tasks
                  </v-btn>
                </template>
              </v-card-text>
            </v-card>

            <v-card v-if="activity.source === 'event'" class="side-card" elevation="0">
              <v-card-title class="text-subtitle-1 font-weight-bold">Linked event</v-card-title>
              <v-card-text>
                <p class="side-copy">
                  View the event page for registration, attendance and certificate
                  details.
                </p>
                <v-btn
                  block
                  color="accent"
                  variant="flat"
                  :to="`/events/${activity.event?.id || activity.eventId}`"
                  prepend-icon="mdi-open-in-new"
                >
                  Open event
                </v-btn>
                <div v-if="activity.event" class="event-facts mt-4">
                  <div v-if="activity.event.registrationCloses">
                    <span class="fact-label">Registration closes</span>
                    <span class="meta-value">{{ formatDateLong(activity.event.registrationCloses) }}</span>
                  </div>
                  <div v-if="activity.event.capacity">
                    <span class="fact-label">Capacity</span>
                    <span class="meta-value">{{ activity.event.registrationCount || 0 }} / {{ activity.event.capacity }}</span>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>

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
import { googleCalendarUrl, outlookCalendarUrl } from '@/utils/calendar'
import {
  activityTypeLabel,
  downloadBlob,
  formatDateLong,
  formatTimeRange,
  venueLabel,
} from '@/utils/weekly'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activity = ref(null)
const task = ref(null)
const loading = ref(false)
const notFound = ref(false)
const error = ref(null)
const taskSaving = ref(false)

const snackbar = reactive({ show: false, message: '', color: 'success' })

const isAuthenticated = computed(() => authStore.isAuthenticated)
const googleUrl = computed(() => (activity.value ? googleCalendarUrl(activity.value) : ''))
const outlookUrl = computed(() => (activity.value ? outlookCalendarUrl(activity.value) : ''))

const showSnack = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

async function load() {
  loading.value = true
  notFound.value = false
  error.value = null
  try {
    const data = await api.weekly.getActivity(route.params.id)
    activity.value = data.activity
    const personalTask = data.personalTask
    task.value = personalTask
      ? { ...personalTask, id: personalTask.id || personalTask._id }
      : null
  } catch (err) {
    if (err.response?.status === 404 || err.response?.status === 401) {
      notFound.value = true
    } else {
      error.value = getErrorMessage(err, 'Could not load this activity.')
    }
  } finally {
    loading.value = false
  }
}

function goSignIn() {
  router.push({ name: 'Login', query: { redirect: route.fullPath } })
}

async function downloadCalendar() {
  try {
    const { blob, filename } = await api.weekly.downloadActivityCalendar(activity.value.id)
    downloadBlob(blob, filename)
  } catch (err) {
    showSnack(getErrorMessage(err, 'Could not download the calendar file.'), 'error')
  }
}

async function addTask() {
  taskSaving.value = true
  try {
    const saved = await api.weekly.createTask({ weeklyActivityId: activity.value.id })
    task.value = saved
    showSnack('Added to your tasks.')
  } catch (err) {
    showSnack(getErrorMessage(err, 'Could not add the task.'), 'error')
  } finally {
    taskSaving.value = false
  }
}

async function updateTask(completed) {
  if (!task.value) return
  try {
    task.value = await api.weekly.updateTask(task.value.id, { completed })
  } catch (err) {
    showSnack(getErrorMessage(err, 'Could not update the task.'), 'error')
  }
}

async function removeTask() {
  if (!task.value) return
  taskSaving.value = true
  try {
    await api.weekly.deleteTask(task.value.id)
    task.value = null
    showSnack('Removed from your tasks.')
  } catch (err) {
    showSnack(getErrorMessage(err, 'Could not remove the task.'), 'error')
  } finally {
    taskSaving.value = false
  }
}

watch(() => route.params.id, load)
onMounted(load)
</script>

<style scoped>
.activity-page {
  --weekly-muted: #4b5563;
  background: rgb(var(--v-theme-background));
  min-height: 72vh;
}

.v-theme--dark .activity-page {
  --weekly-muted: #cbd5e1;
}

.activity-container {
  max-width: 1100px;
  padding-top: 24px;
  padding-bottom: 64px;
}

.back-btn {
  margin-left: -12px;
  margin-bottom: 14px;
  text-transform: none;
}

.activity-hero {
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.activity-title {
  font-size: clamp(1.65rem, 3vw, 2.4rem);
  line-height: 1.2;
}

.activity-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 34px;
  margin-top: 20px;
}

.fact {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  color: rgb(var(--v-theme-primary));
}

.v-theme--dark .fact {
  color: #e9d7a7;
}

.fact-label {
  font-size: 0.64rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--weekly-muted);
}

.fact-value {
  font-size: 0.84rem;
  font-weight: 550;
  color: rgb(var(--v-theme-on-surface));
}

.fact-note {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--weekly-muted);
}

.detail-card,
.side-card,
.not-found-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-bottom: 4px;
}

.activity-description {
  white-space: pre-wrap;
  line-height: 1.8;
  color: var(--weekly-muted);
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.meta-value {
  display: block;
  font-size: 0.86rem;
  color: rgb(var(--v-theme-on-surface));
  overflow-wrap: anywhere;
}

.side-copy {
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--weekly-muted);
  margin-bottom: 12px;
}

.event-facts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.not-found-card {
  text-align: center;
  padding: 42px 24px;
}

.not-found-card h1 {
  font-size: 1.2rem;
  margin: 10px 0 6px;
}

.not-found-card p {
  max-width: 480px;
  margin: 0 auto 18px;
  color: var(--weekly-muted);
  font-size: 0.9rem;
}

@media (max-width: 600px) {
  .activity-facts {
    flex-direction: column;
    gap: 14px;
  }
}
</style>
