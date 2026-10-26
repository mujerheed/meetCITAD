<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <v-text-field
        v-model="search"
        label="Search attendees"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        style="max-width: 320px"
      ></v-text-field>

      <v-select
        v-model="statusFilter"
        :items="statusOptions"
        label="Attendance"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 180px"
      ></v-select>

      <v-spacer></v-spacer>

      <v-chip v-if="selected.length" color="primary" variant="tonal" size="small">
        {{ selected.length }} selected
      </v-chip>

      <v-btn
        v-if="selected.length"
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-account-multiple-check"
        :loading="bulkLoading"
        @click="openBulk"
      >
        Check in selected
      </v-btn>

      <v-btn
        variant="outlined"
        size="small"
        prepend-icon="mdi-download"
        :loading="exporting"
        @click="exportCsv"
      >
        Export CSV
      </v-btn>

      <v-btn icon="mdi-refresh" variant="text" size="small" :loading="loading" @click="load"></v-btn>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="comfortable"
      class="mb-3"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <v-row dense class="mb-3">
      <v-col cols="4">
        <div class="attendance-metric">
          <div class="metric-value">{{ attendees.length }}</div>
          <div class="metric-label">Registered</div>
        </div>
      </v-col>
      <v-col cols="4">
        <div class="attendance-metric">
          <div class="metric-value text-success">{{ attendedCount }}</div>
          <div class="metric-label">Checked in</div>
        </div>
      </v-col>
      <v-col cols="4">
        <div class="attendance-metric">
          <div class="metric-value">{{ attendees.length - attendedCount }}</div>
          <div class="metric-label">Not checked in</div>
        </div>
      </v-col>
    </v-row>

    <v-table v-if="loading || filtered.length" class="admin-table" hover>
      <thead>
        <tr>
          <th style="width: 44px">
            <v-checkbox-btn
              :model-value="allPageSelected"
              :indeterminate="somePageSelected"
              :disabled="!pageRows.length"
              aria-label="Select all attendees on this page"
              @update:model-value="toggleAll"
            ></v-checkbox-btn>
          </th>
          <th>Attendee</th>
          <th>Organisation</th>
          <th>Registered</th>
          <th>Attendance</th>
          <th>Check-in</th>
          <th class="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="loading">
          <tr v-for="index in 4" :key="index">
            <td colspan="7">
              <v-skeleton-loader type="text" class="pa-0"></v-skeleton-loader>
            </td>
          </tr>
        </template>

        <template v-else>
          <tr v-for="attendee in pageRows" :key="attendee.userId">
            <td>
              <v-checkbox-btn
                :model-value="selected.includes(attendee.userId)"
                :disabled="attendee.attended"
                :aria-label="`Select ${attendee.fullname}`"
                @update:model-value="toggleSelected(attendee)"
              ></v-checkbox-btn>
            </td>
            <td style="min-width: 220px">
              <div class="d-flex align-center ga-3">
                <v-avatar size="34" color="primary" class="text-on-primary font-weight-bold">
                  {{ initials(attendee.fullname) }}
                </v-avatar>
                <div class="attendee-identity">
                  <div class="font-weight-medium">{{ attendee.fullname }}</div>
                  <div class="text-caption text-medium-emphasis attendee-email" :title="attendee.email">
                    {{ attendee.email }}
                  </div>
                  <div v-if="attendee.phone" class="text-caption text-medium-emphasis">
                    {{ attendee.phone }}
                  </div>
                </div>
              </div>
            </td>
            <td style="min-width: 120px">{{ attendee.organisation || '—' }}</td>
            <td style="min-width: 110px">{{ formatDate(attendee.registeredAt) }}</td>
            <td>
              <StatusChip :status="attendee.attended ? 'attended' : 'absent'" />
            </td>
            <td style="min-width: 130px">
              <div v-if="attendee.attended" class="text-body-2">
                {{ formatDateTime(attendee.checkInTime) }}
              </div>
              <span v-else class="text-medium-emphasis">—</span>
              <div v-if="attendee.attended" class="text-caption text-medium-emphasis text-capitalize">
                {{ attendee.checkInMethod || 'manual' }}
              </div>
            </td>
            <td class="text-right">
              <v-btn
                v-if="!attendee.attended"
                size="small"
                variant="text"
                color="primary"
                prepend-icon="mdi-account-check-outline"
                :loading="actionLoadingId === attendee.userId"
                @click="openCheckIn(attendee)"
              >
                Check in
              </v-btn>
              <v-btn
                v-else
                size="small"
                variant="text"
                color="warning"
                prepend-icon="mdi-undo"
                :loading="actionLoadingId === attendee.userId"
                @click="openUndo(attendee)"
              >
                Undo
              </v-btn>
            </td>
          </tr>
        </template>
      </tbody>
    </v-table>

    <EmptyState
      v-else
      icon="mdi-account-search-outline"
      title="No attendees found"
      message="Try a different search term, or wait for participants to register."
    />

    <div v-if="filtered.length > pageSize" class="d-flex justify-center pt-4">
      <v-pagination
        v-model="page"
        :length="totalPages"
        :total-visible="6"
        density="comfortable"
      ></v-pagination>
    </div>

    <ConfirmDialog
      v-model="actionDialog.show"
      :title="actionDialog.title"
      :confirm-text="actionDialog.confirmText"
      :color="actionDialog.color"
      :loading="actionDialog.loading"
      @confirm="confirmAction"
    >
      {{ actionDialog.message }}
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import StatusChip from '@/components/StatusChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { downloadCsv, filenameTimestamp, slug } from '@/utils/download'

const props = defineProps({
  eventId: { type: String, required: true },
  eventTitle: { type: String, default: '' },
})

const emit = defineEmits(['updated'])
const { notifySuccess, notifyError } = useSnackbar()

const loading = ref(true)
const exporting = ref(false)
const error = ref(null)
const attendees = ref([])
const search = ref('')
const statusFilter = ref('all')
const selected = ref([])
const page = ref(1)
const pageSize = 15
const bulkLoading = ref(false)
const actionLoadingId = ref(null)

const statusOptions = [
  { title: 'All attendees', value: 'all' },
  { title: 'Checked in', value: 'attended' },
  { title: 'Not checked in', value: 'absent' },
]

const actionDialog = reactive({
  show: false,
  type: 'checkin',
  attendee: null,
  title: '',
  message: '',
  confirmText: 'Confirm',
  color: 'primary',
  loading: false,
})

const initials = (name = '') =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

const attendedCount = computed(
  () => attendees.value.filter((attendee) => attendee.attended).length
)

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()

  return attendees.value.filter((attendee) => {
    if (statusFilter.value === 'attended' && !attendee.attended) return false
    if (statusFilter.value === 'absent' && attendee.attended) return false
    if (!query) return true

    return [attendee.fullname, attendee.email, attendee.phone, attendee.organisation]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))

const pageRows = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

const allPageSelected = computed(
  () =>
    pageRows.value.length > 0 &&
    pageRows.value.every((attendee) => attendee.attended || selected.value.includes(attendee.userId))
)

const somePageSelected = computed(
  () =>
    !allPageSelected.value &&
    pageRows.value.some((attendee) => selected.value.includes(attendee.userId))
)

watch([search, statusFilter], () => {
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

const toggleSelected = (attendee) => {
  if (attendee.attended) return
  const index = selected.value.indexOf(attendee.userId)
  if (index >= 0) selected.value.splice(index, 1)
  else selected.value.push(attendee.userId)
}

const toggleAll = (value) => {
  const ids = pageRows.value.filter((attendee) => !attendee.attended).map((item) => item.userId)

  if (value) {
    selected.value = Array.from(new Set([...selected.value, ...ids]))
  } else {
    selected.value = selected.value.filter((id) => !ids.includes(id))
  }
}

const emitSummary = () => {
  emit('updated', {
    registered: attendees.value.length,
    attended: attendedCount.value,
    absent: attendees.value.length - attendedCount.value,
  })
}

const load = async () => {
  if (!props.eventId) return
  loading.value = true
  error.value = null

  try {
    const result = await api.events.attendees(props.eventId, {
      page: 1,
      limit: 500,
    })
    attendees.value = result.attendees || []
    selected.value = selected.value.filter((id) =>
      attendees.value.some((attendee) => attendee.userId === id && !attendee.attended)
    )
    emitSummary()
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load the attendee list.')
  } finally {
    loading.value = false
  }
}

const openCheckIn = (attendee) => {
  actionDialog.type = 'checkin'
  actionDialog.attendee = attendee
  actionDialog.title = 'Check in attendee?'
  actionDialog.message = `Mark ${attendee.fullname} as attended for this event? This records a manual check-in.`
  actionDialog.confirmText = 'Check In'
  actionDialog.color = 'primary'
  actionDialog.show = true
}

const openUndo = (attendee) => {
  actionDialog.type = 'undo'
  actionDialog.attendee = attendee
  actionDialog.title = 'Undo check-in?'
  actionDialog.message = `Remove the attendance record for ${attendee.fullname}? The participant will no longer be marked as attended.`
  actionDialog.confirmText = 'Undo Check-in'
  actionDialog.color = 'warning'
  actionDialog.show = true
}

const openBulk = () => {
  if (!selected.value.length) return
  actionDialog.type = 'bulk'
  actionDialog.attendee = null
  actionDialog.title = 'Check in selected attendees?'
  actionDialog.message = `${selected.value.length} attendee(s) will be marked as attended. Already checked-in participants are skipped.`
  actionDialog.confirmText = 'Check In Selected'
  actionDialog.color = 'primary'
  actionDialog.show = true
}

const confirmAction = async () => {
  actionDialog.loading = true
  actionLoadingId.value = actionDialog.attendee?.userId || null

  try {
    if (actionDialog.type === 'bulk') {
      bulkLoading.value = true
      const result = await api.attendance.bulkCheckIn(props.eventId, selected.value)
      notifySuccess(
        `Checked in ${result.successCount} attendee(s). ${result.failedCount} could not be checked in.`
      )
      selected.value = []
      await load()
    } else if (actionDialog.type === 'checkin') {
      const result = await api.attendance.manualCheckIn(
        props.eventId,
        actionDialog.attendee.userId
      )
      const attendee = attendees.value.find(
        (item) => item.userId === actionDialog.attendee.userId
      )
      if (attendee) {
        attendee.attended = true
        attendee.checkInTime = result.checkInTime || new Date().toISOString()
        attendee.checkInMethod = 'manual'
      }
      notifySuccess(`${actionDialog.attendee.fullname} checked in.`)
      emitSummary()
    } else if (actionDialog.type === 'undo') {
      await api.attendance.undoCheckIn(props.eventId, actionDialog.attendee.userId)
      const attendee = attendees.value.find(
        (item) => item.userId === actionDialog.attendee.userId
      )
      if (attendee) {
        attendee.attended = false
        attendee.checkInTime = null
        attendee.checkInMethod = null
      }
      notifySuccess('Check-in undone.')
      emitSummary()
    }

    actionDialog.show = false
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not update attendance.'))
  } finally {
    actionDialog.loading = false
    bulkLoading.value = false
    actionLoadingId.value = null
  }
}

const exportCsv = async () => {
  exporting.value = true

  try {
    const report = await api.attendance.report(props.eventId)
    downloadCsv(
      `attendance-${slug(props.eventTitle || props.eventId)}-${filenameTimestamp()}.csv`,
      [
        { label: 'Full name', key: 'fullname' },
        { label: 'Email', key: 'email' },
        { label: 'Phone', key: 'phone' },
        { label: 'Organisation', key: 'organisation' },
        { label: 'Registration status', key: 'status' },
        {
          label: 'Registered at',
          value: (row) => formatDateTime(row.registeredAt),
        },
        {
          label: 'Attended',
          value: (row) => (row.attended ? 'Yes' : 'No'),
        },
        {
          label: 'Check-in time',
          value: (row) => formatDateTime(row.checkInTime),
        },
      ],
      report.attendees || []
    )
    notifySuccess('Attendance report exported.')
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not export attendance.'))
  } finally {
    exporting.value = false
  }
}

onMounted(load)

defineExpose({ load, attendees })
</script>

<style scoped>
.admin-table :deep(th),
.admin-table :deep(td) {
  padding: 10px 12px;
}

.attendee-identity {
  min-width: 0;
}

.attendee-email {
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attendance-metric {
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  padding: 12px 14px;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
}

.metric-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--admin-muted);
}
</style>
