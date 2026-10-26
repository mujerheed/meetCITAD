<template>
  <v-dialog
    :model-value="modelValue"
    max-width="920"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="admin-card" elevation="0">
      <v-card-title class="d-flex align-center pt-5 px-6">
        <div>
          <div class="text-subtitle-1 font-weight-bold">
            {{ isEdit ? 'Edit weekly activity' : 'Add weekly activity' }}
          </div>
          <div class="section-caption mt-1">
            Weekly activities are schedule entries. Linked events remain the source
            of registration, attendance, certificates and feedback.
          </div>
        </div>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close"
          :disabled="saving"
          @click="close"
        ></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="px-6 py-5">
        <v-alert
          v-if="linked"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-5"
          icon="mdi-link-variant"
        >
          This entry is linked to <strong>{{ activity?.title }}</strong>. Edit the
          event itself to change its title, date, venue or description.
        </v-alert>

        <v-form ref="formRef" @submit.prevent="save">
          <template v-if="!linked">
            <div class="form-section" style="padding-top: 0">
              <div class="form-section-title">Activity details</div>
              <div class="form-section-caption">
                This is the information participants will see in the weekly schedule.
              </div>

              <v-text-field
                v-model="form.title"
                label="Activity title"
                variant="outlined"
                counter="200"
                maxlength="200"
                :rules="[required('Activity title is required')]"
              ></v-text-field>

              <v-textarea
                v-model="form.description"
                label="Description"
                variant="outlined"
                rows="3"
                counter="5000"
                maxlength="5000"
                hint="Optional. Keep this concise for the weekly schedule."
                persistent-hint
                class="mb-4"
              ></v-textarea>

              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="form.activityType"
                    :items="ACTIVITY_TYPES"
                    label="Activity type"
                    variant="outlined"
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.referenceCode"
                    label="Reference code"
                    variant="outlined"
                    hint="Optional internal reference"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.project"
                    label="Project / programme"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.department"
                    label="Department / unit"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>

            <div class="form-section">
              <div class="form-section-title">Schedule and venue</div>
              <div class="form-section-caption">
                All times are entered and displayed in Africa/Lagos (WAT).
              </div>

              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.startDateTime"
                    label="Start date and time"
                    type="datetime-local"
                    variant="outlined"
                    :rules="[required('Start date and time is required')]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.endDateTime"
                    label="End date and time"
                    type="datetime-local"
                    variant="outlined"
                    :rules="[endRule]"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-checkbox
                v-model="form.allDay"
                label="All-day activity"
                density="compact"
                hide-details
                class="mb-3"
              ></v-checkbox>

              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="form.mode"
                    :items="modeOptions"
                    label="Participation mode"
                    variant="outlined"
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.meetingUrl"
                    label="Meeting link"
                    variant="outlined"
                    placeholder="https://"
                    hint="Only shown to signed-in participants."
                    persistent-hint
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.venue.name"
                    label="Venue name"
                    variant="outlined"
                    :rules="[required('Venue name is required')]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.venue.address"
                    label="Venue address"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="form.venue.city"
                    label="City"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="form.venue.state"
                    label="State"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="form.venue.country"
                    label="Country"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>
          </template>

          <div class="form-section" :style="linked ? 'padding-top: 0' : ''">
            <div class="form-section-title">Weekly schedule settings</div>
            <div class="form-section-caption">
              Visibility controls who can see this item. Staff-only items never
              appear in public schedules or shareable summaries.
            </div>

            <v-row dense>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="form.activityType"
                  :items="ACTIVITY_TYPES"
                  label="Schedule category"
                  variant="outlined"
                  :disabled="!linked"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="form.visibility"
                  :items="VISIBILITY_OPTIONS"
                  label="Visibility"
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="form.status"
                  :items="STATUS_OPTIONS"
                  label="Activity status"
                  variant="outlined"
                  :disabled="!canPublish"
                  :hint="
                    canPublish
                      ? 'Publishing the week publishes every non-archived activity.'
                      : 'A programme manager must publish this activity.'
                  "
                  persistent-hint
                ></v-select>
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.project"
                  label="Project / programme"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.department"
                  label="Department / unit"
                  variant="outlined"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-textarea
              v-model="form.internalNotes"
              label="Internal notes"
              variant="outlined"
              rows="2"
              counter="3000"
              maxlength="3000"
              hint="Never shown to participants."
              persistent-hint
            ></v-textarea>
          </div>

          <div class="form-section">
            <div class="form-section-title">Contact information</div>
            <div class="form-section-caption">
              Public contact details are only shown when “Show contact publicly” is
              enabled.
            </div>

            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.contact.name"
                  label="Contact name"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.contact.department"
                  label="Contact department"
                  variant="outlined"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.contact.officialEmail"
                  label="Official email (internal)"
                  type="email"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.contact.phone"
                  label="Official phone (internal)"
                  variant="outlined"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.contact.publicEmail"
                  label="Public email"
                  type="email"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.contact.publicPhone"
                  label="Public phone"
                  variant="outlined"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-checkbox
              v-model="form.contact.showPublicContact"
              label="Show contact publicly"
              density="compact"
              hide-details
            ></v-checkbox>
          </div>

          <div class="form-section">
            <div class="form-section-title">Banner image</div>
            <div class="form-section-caption">
              Optional. A weekly banner can override the linked event banner on the
              schedule.
            </div>
            <v-file-input
              v-model="bannerFile"
              label="Upload banner"
              accept="image/*"
              variant="outlined"
              prepend-icon="mdi-image-outline"
              show-size
              hint="JPG, PNG or WebP, up to 5 MB. Recommended 1200 × 630."
              persistent-hint
            ></v-file-input>
            <v-img
              v-if="activity?.bannerImage || activity?.thumbnail"
              :src="activity.thumbnail || activity.bannerImage"
              max-height="150"
              max-width="360"
              cover
              class="rounded mt-3"
            ></v-img>
          </div>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="px-6 py-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn
          color="accent"
          variant="flat"
          elevation="0"
          :loading="saving"
          @click="save"
        >
          {{ isEdit ? 'Save changes' : 'Add activity' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import { useAuthStore } from '@/stores/auth'
import {
  ACTIVITY_TYPES,
  STATUS_OPTIONS,
  VISIBILITY_OPTIONS,
  toDateTimeLocal,
  toLagosIso,
} from '@/utils/weekly'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  programId: { type: String, default: '' },
  activity: { type: Object, default: null },
  weekStart: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'saved'])
const { notifySuccess, notifyError } = useSnackbar()
const auth = useAuthStore()
const canPublish = computed(() => auth.can('publish_weekly_programs'))

const formRef = ref(null)
const saving = ref(false)
const bannerFile = ref(null)

const modeOptions = [
  { title: 'Physical', value: 'physical' },
  { title: 'Virtual', value: 'virtual' },
  { title: 'Hybrid', value: 'hybrid' },
]

const form = reactive({
  title: '',
  description: '',
  activityType: 'meeting',
  project: '',
  department: '',
  referenceCode: '',
  startDateTime: '',
  endDateTime: '',
  allDay: false,
  mode: 'physical',
  meetingUrl: '',
  venue: { name: '', address: '', city: '', state: '', country: 'Nigeria' },
  contact: {
    name: '',
    department: '',
    officialEmail: '',
    phone: '',
    publicEmail: '',
    publicPhone: '',
    showPublicContact: false,
  },
  internalNotes: '',
  visibility: 'public',
  status: 'draft',
})

const isEdit = computed(() => Boolean(props.activity?.id))
const linked = computed(() => props.activity?.source === 'event')

const required = (message) => (value) => Boolean(String(value || '').trim()) || message
const endRule = (value) => {
  if (!value) return 'End date and time is required'
  if (form.startDateTime && new Date(value) <= new Date(form.startDateTime)) {
    return 'End must be after the start'
  }
  return true
}

function reset() {
  bannerFile.value = null
  const activity = props.activity
  const defaultStart = props.weekStart ? `${props.weekStart}T09:00` : ''
  const defaultEnd = props.weekStart ? `${props.weekStart}T10:00` : ''

  Object.assign(form, {
    title: activity?.title || '',
    description: activity?.description || '',
    activityType: activity?.activityType || 'meeting',
    project: activity?.project || '',
    department: activity?.department || '',
    referenceCode: activity?.referenceCode || '',
    startDateTime: activity?.startDateTime
      ? toDateTimeLocal(activity.startDateTime)
      : defaultStart,
    endDateTime: activity?.endDateTime
      ? toDateTimeLocal(activity.endDateTime)
      : defaultEnd,
    allDay: Boolean(activity?.allDay),
    mode: activity?.mode || 'physical',
    meetingUrl: activity?.meetingUrl || '',
    venue: {
      name: activity?.venue?.name || '',
      address: activity?.venue?.address || '',
      city: activity?.venue?.city || '',
      state: activity?.venue?.state || '',
      country: activity?.venue?.country || 'Nigeria',
    },
    contact: {
      name: activity?.contact?.name || '',
      department: activity?.contact?.department || '',
      officialEmail: activity?.contact?.officialEmail || '',
      phone: activity?.contact?.phone || '',
      publicEmail: activity?.contact?.publicEmail || '',
      publicPhone: activity?.contact?.publicPhone || '',
      showPublicContact: Boolean(activity?.contact?.showPublicContact),
    },
    internalNotes: activity?.internalNotes || '',
    visibility: activity?.visibility || 'public',
    status: activity?.status === 'published' ? 'published' : 'draft',
  })
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset()
  }
)

function buildPayload() {
  const contact = Object.fromEntries(
    Object.entries(form.contact).filter(([, value]) => value !== '' && value !== null)
  )

  const base = {
    activityType: form.activityType,
    project: form.project,
    department: form.department,
    referenceCode: form.referenceCode,
    visibility: form.visibility,
    // Staff manage activities but never publish them. Omitting the field keeps
    // an existing published state intact instead of sending a forbidden change.
    ...(canPublish.value ? { status: form.status } : {}),
    mode: form.mode,
    meetingUrl: form.meetingUrl || null,
    contact,
    internalNotes: form.internalNotes,
  }

  if (linked.value) return base

  return {
    ...base,
    title: form.title,
    description: form.description,
    startDateTime: toLagosIso(form.startDateTime),
    endDateTime: toLagosIso(form.endDateTime),
    allDay: form.allDay,
    venue: form.venue,
  }
}

async function save() {
  const valid = await formRef.value?.validate()
  if (valid && valid.valid === false) return
  if (!props.programId) return

  saving.value = true
  try {
    const payload = buildPayload()
    let saved
    if (isEdit.value) {
      saved = await api.weeklyPrograms.updateActivity(
        props.programId,
        props.activity.id,
        payload
      )
    } else {
      saved = await api.weeklyPrograms.createActivity(props.programId, payload)
    }

    if (bannerFile.value) {
      try {
        saved = await api.weeklyPrograms.uploadBanner(
          props.programId,
          saved.id,
          Array.isArray(bannerFile.value) ? bannerFile.value[0] : bannerFile.value
        )
      } catch (bannerError) {
        emit('saved', saved)
        notifyError(
          getErrorMessage(
            bannerError,
            'The activity was saved, but its banner could not be uploaded. Reopen the activity to retry the image.'
          )
        )
        saving.value = false
        close()
        return
      }
    }

    notifySuccess(isEdit.value ? 'Weekly activity updated.' : 'Weekly activity added.')
    emit('saved', saved)
    saving.value = false
    close()
  } catch (error) {
    notifyError(getErrorMessage(error, 'Could not save the weekly activity.'))
  } finally {
    saving.value = false
  }
}

function close() {
  if (saving.value) return
  emit('update:modelValue', false)
}
</script>

<style scoped>
.form-section {
  padding: 20px 0;
  border-top: 1px solid var(--admin-border);
}

.form-section:first-child {
  border-top: 0;
}

.form-section-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.form-section-caption {
  margin: 3px 0 14px;
  font-size: 0.78rem;
  color: var(--admin-muted);
}
</style>
