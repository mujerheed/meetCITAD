<template>
  <v-dialog
    :model-value="modelValue"
    max-width="960"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="admin-card" elevation="0">
      <v-card-title class="d-flex align-center pt-5 px-6">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Participant preview</div>
          <div class="section-caption mt-1">
            Public fields only. Draft and restricted items are marked for review.
          </div>
        </div>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close"
          @click="$emit('update:modelValue', false)"
        ></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="px-6 py-5">
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
          closable
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>

        <v-skeleton-loader v-if="loading" type="article, article"></v-skeleton-loader>

        <template v-else-if="schedule">
          <div class="preview-heading">
            <div class="preview-eyebrow">CITAD Weekly Programs</div>
            <h2 class="text-h5 font-weight-bold mb-1">{{ schedule.weekLabel }}</h2>
            <div class="section-caption">
              {{ schedule.weekRange || '' }}
              <span v-if="schedule.program?.status !== 'published'">
                · This week is still a draft.
              </span>
            </div>
          </div>

          <v-alert
            v-if="!schedule.activities?.length"
            type="info"
            variant="tonal"
            density="compact"
            class="my-5"
          >
            No activities will be visible in the published schedule yet.
          </v-alert>

          <div
            v-for="group in groups"
            :key="group.key"
            class="preview-day"
          >
            <div class="preview-day-heading">{{ group.label }}</div>
            <v-card
              v-for="activity in group.items"
              :key="activity.id"
              class="preview-activity"
              elevation="0"
            >
              <div class="preview-time">
                {{ formatTimeRange(activity.startDateTime, activity.endDateTime, activity.allDay) }}
              </div>
              <div class="preview-body">
                <div class="d-flex flex-wrap align-center ga-2 mb-1">
                  <strong>{{ activity.title }}</strong>
                  <v-chip v-if="activity.source === 'event'" size="x-small" variant="tonal" color="info">
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
                <div v-if="activity.contact?.email" class="text-caption text-medium-emphasis mt-1">
                  Contact: {{ activity.contact.email }}
                </div>
              </div>
            </v-card>
          </div>
        </template>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="px-6 py-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import api, { getErrorMessage } from '@/api'
import {
  formatDayLabel,
  formatTimeRange,
  visibilityLabel,
} from '@/utils/weekly'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  program: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])
const schedule = ref(null)
const loading = ref(false)
const error = ref(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) load()
  }
)

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

const venueText = (activity) => {
  const venue = activity.venue || {}
  const parts = [venue.name, venue.city, venue.state].filter(Boolean)
  if (activity.mode === 'virtual') return parts[0] ? `${parts[0]} · Virtual` : 'Virtual'
  if (activity.mode === 'hybrid') return `${parts.join(', ') || 'CITAD'} · Hybrid`
  return parts.join(', ') || 'CITAD, Kano'
}

async function load() {
  if (!props.program?.id) return
  loading.value = true
  error.value = null
  try {
    schedule.value = await api.weeklyPrograms.preview(props.program.id)
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load the participant preview.')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.preview-heading {
  padding: 4px 0 18px;
  border-bottom: 1px solid var(--admin-border);
  margin-bottom: 14px;
}

.preview-eyebrow {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

.v-theme--dark .preview-eyebrow {
  color: #e9d7a7;
}

.preview-day {
  margin-top: 18px;
}

.preview-day-heading {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--admin-muted);
  padding-bottom: 6px;
}

.preview-activity {
  display: flex;
  gap: 18px;
  border: 1px solid var(--admin-border);
  padding: 14px 16px;
  margin-bottom: 8px;
}

.preview-time {
  width: 150px;
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.v-theme--dark .preview-time {
  color: #e9d7a7;
}

.preview-body {
  min-width: 0;
}

@media (max-width: 600px) {
  .preview-activity {
    flex-direction: column;
    gap: 4px;
  }

  .preview-time {
    width: auto;
  }
}
</style>
