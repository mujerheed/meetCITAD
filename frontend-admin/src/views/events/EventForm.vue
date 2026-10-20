<template>
  <div>
    <PageHeader
      :title="isEdit ? 'Edit Event' : 'Create Event'"
      :subtitle="
        isEdit
          ? 'Update event details, participation settings, and media.'
          : 'Set up a new CITAD program. It can be saved as a draft before publishing.'
      "
      :icon="isEdit ? 'mdi-pencil-outline' : 'mdi-calendar-plus'"
    >
      <template #actions>
        <v-btn variant="text" :to="cancelTarget">Cancel</v-btn>
        <v-btn
          color="accent"
          variant="flat"
          elevation="0"
          prepend-icon="mdi-content-save-outline"
          :loading="saving"
          @click="submit"
        >
          {{ isEdit ? 'Save Changes' : 'Create Event' }}
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

    <v-alert
      v-if="started"
      type="info"
      variant="tonal"
      class="mb-5"
      icon="mdi-information-outline"
    >
      This event has already started. The schedule and capacity are locked by
      the server; other details can still be updated.
    </v-alert>

    <v-form ref="formRef" @submit.prevent="submit">
      <v-row dense>
        <v-col cols="12" lg="8">
          <v-card class="admin-card mb-4" elevation="0">
            <v-card-text class="pa-6">
              <div class="form-section" style="padding-top: 0">
                <div class="form-section-title">Basic information</div>
                <div class="form-section-caption">
                  This is what participants see in the public event listing.
                </div>

                <v-text-field
                  v-model="form.title"
                  label="Event title"
                  variant="outlined"
                  counter="200"
                  maxlength="200"
                  :rules="titleRules"
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  v-model="form.shortDescription"
                  label="Short description"
                  variant="outlined"
                  counter="300"
                  maxlength="300"
                  hint="A one-line summary shown on event cards."
                  persistent-hint
                  class="mb-5"
                ></v-text-field>

                <v-textarea
                  v-model="form.description"
                  label="Full description"
                  variant="outlined"
                  rows="6"
                  counter="2000"
                  maxlength="2000"
                  :rules="descriptionRules"
                ></v-textarea>
              </div>

              <div class="form-section">
                <div class="form-section-title">Classification</div>
                <div class="form-section-caption">
                  Help participants find the event and understand who is hosting it.
                </div>

                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-select
                      v-model="form.category"
                      :items="categoryOptions"
                      label="Category"
                      variant="outlined"
                    ></v-select>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.hostBy"
                      label="Hosted by"
                      variant="outlined"
                      :rules="[(v) => Boolean(v) || 'Host information is required']"
                    ></v-text-field>
                  </v-col>
                </v-row>

                <v-text-field
                  v-model="tagsInput"
                  label="Tags"
                  placeholder="civic technology, digital rights, workshop"
                  variant="outlined"
                  hint="Separate tags with commas."
                  persistent-hint
                ></v-text-field>
              </div>

              <div class="form-section">
                <div class="form-section-title">Schedule</div>
                <div class="form-section-caption">
                  Times are shown in the event timezone. Use the local date and time pickers.
                </div>

                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.startDateTime"
                      label="Start date and time"
                      type="datetime-local"
                      variant="outlined"
                      :disabled="started"
                      :rules="[(v) => Boolean(v) || 'Start date and time is required']"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.endDateTime"
                      label="End date and time"
                      type="datetime-local"
                      variant="outlined"
                      :disabled="started"
                      :rules="endDateRules"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.timezone"
                      label="Timezone"
                      variant="outlined"
                    ></v-text-field>
                  </v-col>
                </v-row>

                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.registrationOpens"
                      label="Registration opens"
                      type="datetime-local"
                      variant="outlined"
                      hint="Optional"
                      persistent-hint
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.registrationCloses"
                      label="Registration closes"
                      type="datetime-local"
                      variant="outlined"
                      hint="Optional"
                      persistent-hint
                    ></v-text-field>
                  </v-col>
                </v-row>
              </div>

              <div class="form-section">
                <div class="form-section-title">Venue</div>
                <div class="form-section-caption">
                  Provide enough detail for participants to find the venue.
                </div>

                <v-text-field
                  v-model="form.venue.name"
                  label="Venue name"
                  variant="outlined"
                  :rules="[(v) => Boolean(v) || 'Venue name is required']"
                  class="mb-2"
                ></v-text-field>
                <v-text-field
                  v-model="form.venue.address"
                  label="Street address"
                  variant="outlined"
                  class="mb-2"
                ></v-text-field>
                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.venue.city"
                      label="City"
                      variant="outlined"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.venue.state"
                      label="State"
                      variant="outlined"
                    ></v-text-field>
                  </v-col>
                </v-row>
              </div>

              <div class="form-section">
                <div class="form-section-title">Speakers and facilitators</div>
                <div class="form-section-caption">
                  Optional. Add the people leading sessions.
                </div>

                <div
                  v-for="(speaker, index) in form.speakers"
                  :key="index"
                  class="speaker-row"
                >
                  <v-row dense>
                    <v-col cols="12" sm="5">
                      <v-text-field
                        v-model="speaker.name"
                        label="Name"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" sm="5">
                      <v-text-field
                        v-model="speaker.title"
                        label="Title / organisation"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" sm="2" class="d-flex align-center">
                      <v-btn
                        icon="mdi-delete-outline"
                        variant="text"
                        size="small"
                        color="error"
                        aria-label="Remove speaker"
                        @click="removeSpeaker(index)"
                      ></v-btn>
                    </v-col>
                  </v-row>
                </div>

                <v-btn
                  variant="outlined"
                  color="primary"
                  size="small"
                  prepend-icon="mdi-plus"
                  @click="addSpeaker"
                >
                  Add speaker
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card class="admin-card mb-4" elevation="0">
            <v-card-text class="pa-6">
              <div class="form-section-title mb-1">Publishing</div>
              <div class="form-section-caption">
                Draft events are visible only to administrators.
              </div>

              <v-select
                v-model="form.status"
                :items="statusOptions"
                label="Status"
                variant="outlined"
                class="mb-3"
              ></v-select>

              <v-select
                v-model="form.visibility"
                :items="visibilityOptions"
                label="Visibility"
                variant="outlined"
              ></v-select>
            </v-card-text>
          </v-card>

          <v-card class="admin-card mb-4" elevation="0">
            <v-card-text class="pa-6">
              <div class="form-section-title mb-1">Capacity and registration</div>
              <div class="form-section-caption">
                Controls how many participants can register.
              </div>

              <v-text-field
                v-model.number="form.capacity"
                label="Capacity"
                type="number"
                min="1"
                max="10000"
                variant="outlined"
                :disabled="started"
                :rules="capacityRules"
              ></v-text-field>

              <v-switch
                v-model="form.requireApproval"
                label="Require registration approval"
                color="primary"
                density="compact"
                hide-details
                class="mb-2"
              ></v-switch>

              <v-switch
                v-model="form.waitlistEnabled"
                label="Enable waitlist when full"
                color="primary"
                density="compact"
                hide-details
              ></v-switch>
            </v-card-text>
          </v-card>

          <v-card class="admin-card mb-4" elevation="0">
            <v-card-text class="pa-6">
              <div class="form-section-title mb-1">Event features</div>
              <div class="form-section-caption">
                Choose what participants can access after the event.
              </div>

              <v-switch
                v-model="form.certificateEnabled"
                label="Issue certificates"
                color="primary"
                density="compact"
                hide-details
                class="mb-2"
              ></v-switch>

              <v-switch
                v-model="form.feedbackEnabled"
                label="Collect feedback"
                color="primary"
                density="compact"
                hide-details
              ></v-switch>
            </v-card-text>
          </v-card>

          <v-card class="admin-card" elevation="0">
            <v-card-text class="pa-6">
              <div class="form-section-title mb-1">Event media</div>
              <div class="form-section-caption">
                Use a 1200 × 630 image for the event banner.
              </div>

              <div v-if="bannerPreview" class="banner-preview mb-3">
                <v-img :src="bannerPreview" cover aspect-ratio="16/9"></v-img>
              </div>

              <v-text-field
                v-model="form.bannerImage"
                label="Banner image URL or path"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              ></v-text-field>

              <v-file-input
                v-model="bannerFile"
                label="Upload banner"
                accept="image/*"
                variant="outlined"
                density="comfortable"
                prepend-icon=""
                prepend-inner-icon="mdi-image-plus"
                hint="Uploaded after the event is saved."
                persistent-hint
                class="mb-4"
              ></v-file-input>

              <v-file-input
                v-model="galleryFiles"
                label="Upload gallery images"
                accept="image/*"
                multiple
                variant="outlined"
                density="comfortable"
                prepend-icon=""
                prepend-inner-icon="mdi-images-outline"
                hint="Optional. Uploaded after the event is saved."
                persistent-hint
              ></v-file-input>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <div class="d-flex flex-wrap justify-end ga-2 mt-4">
        <v-btn variant="text" :to="cancelTarget">Cancel</v-btn>
        <v-btn
          color="accent"
          variant="flat"
          elevation="0"
          size="large"
          prepend-icon="mdi-content-save-outline"
          :loading="saving"
          @click="submit"
        >
          {{ isEdit ? 'Save Changes' : 'Create Event' }}
        </v-btn>
      </div>
    </v-form>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import { resolveMediaUrl } from '@/utils/normalizers'

const route = useRoute()
const router = useRouter()
const { notifySuccess, notifyError } = useSnackbar()

const formRef = ref(null)
const isEdit = computed(() => route.name === 'EventEdit')
const eventId = computed(() => route.params.id)
const cancelTarget = computed(() =>
  isEdit.value ? `/events/${eventId.value}` : '/events'
)

const loading = ref(false)
const saving = ref(false)
const error = ref(null)
const started = ref(false)
const tagsInput = ref('')
const bannerFile = ref(null)
const galleryFiles = ref([])

const form = reactive({
  title: '',
  shortDescription: '',
  description: '',
  category: 'seminar',
  hostBy: 'CITAD',
  status: 'draft',
  visibility: 'public',
  startDateTime: '',
  endDateTime: '',
  timezone: 'Africa/Lagos',
  registrationOpens: '',
  registrationCloses: '',
  capacity: 50,
  requireApproval: false,
  waitlistEnabled: false,
  certificateEnabled: true,
  feedbackEnabled: true,
  bannerImage: '',
  venue: {
    name: '',
    address: '',
    city: 'Kano',
    state: 'Kano',
    country: 'Nigeria',
  },
  speakers: [],
})

const categoryOptions = [
  { title: 'Workshop', value: 'workshop' },
  { title: 'Seminar', value: 'seminar' },
  { title: 'Training', value: 'training' },
  { title: 'Conference', value: 'conference' },
  { title: 'Webinar', value: 'webinar' },
  { title: 'Other', value: 'other' },
]

const statusOptions = [
  { title: 'Draft', value: 'draft' },
  { title: 'Published', value: 'published' },
  { title: 'Ongoing', value: 'ongoing' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' },
]

const visibilityOptions = [
  { title: 'Public', value: 'public' },
  { title: 'Unlisted', value: 'unlisted' },
  { title: 'Private', value: 'private' },
]

const titleRules = [
  (value) => Boolean(value) || 'Title is required',
  (value) =>
    (value || '').trim().length >= 5 || 'Title must be at least 5 characters',
]

const descriptionRules = [
  (value) => Boolean(value) || 'Description is required',
  (value) =>
    (value || '').trim().length >= 20 ||
    'Description must be at least 20 characters',
]

const capacityRules = [
  (value) =>
    (Number(value) >= 1 && Number(value) <= 10000) ||
    'Capacity must be between 1 and 10,000',
]

const endDateRules = [
  (value) => Boolean(value) || 'End date and time is required',
  (value) =>
    !form.startDateTime ||
    new Date(value) > new Date(form.startDateTime) ||
    'End time must be after the start time',
]

const bannerObjectUrl = ref('')

watch(
  bannerFile,
  (value) => {
    if (bannerObjectUrl.value) URL.revokeObjectURL(bannerObjectUrl.value)

    const file = Array.isArray(value) ? value[0] : value
    bannerObjectUrl.value = file ? URL.createObjectURL(file) : ''
  },
  { immediate: true }
)

const bannerPreview = computed(
  () => bannerObjectUrl.value || (form.bannerImage ? resolveMediaUrl(form.bannerImage) : '')
)

onBeforeUnmount(() => {
  if (bannerObjectUrl.value) URL.revokeObjectURL(bannerObjectUrl.value)
})

const toLocalInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const toISO = (value) => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

const addSpeaker = () => {
  form.speakers.push({ name: '', title: '', bio: '' })
}

const removeSpeaker = (index) => {
  form.speakers.splice(index, 1)
}

const loadEvent = async () => {
  loading.value = true
  error.value = null

  try {
    const event = await api.events.get(eventId.value)
    const venue =
      event.venue && typeof event.venue === 'object'
        ? event.venue
        : { name: event.venueName || '', address: '', city: 'Kano', state: 'Kano' }

    Object.assign(form, {
      title: event.title || '',
      shortDescription: event.shortDescription || '',
      description: event.description || '',
      category: String(event.category || 'seminar').toLowerCase(),
      hostBy: event.hostBy || 'CITAD',
      status: event.status || 'draft',
      visibility: event.visibility || 'public',
      startDateTime: toLocalInput(event.startDate),
      endDateTime: toLocalInput(event.endDate),
      timezone: event.timezone || 'Africa/Lagos',
      registrationOpens: toLocalInput(event.registrationOpens),
      registrationCloses: toLocalInput(event.registrationCloses),
      capacity: event.capacity || 50,
      requireApproval: Boolean(event.requireApproval),
      waitlistEnabled: Boolean(event.waitlistEnabled),
      certificateEnabled: event.certificateEnabled !== false,
      feedbackEnabled: event.feedbackEnabled !== false,
      bannerImage: event.bannerImage || '',
      venue: {
        name: venue.name || '',
        address: venue.address || '',
        city: venue.city || 'Kano',
        state: venue.state || 'Kano',
        country: venue.country || 'Nigeria',
      },
      speakers: Array.isArray(event.speakers)
        ? event.speakers.map((speaker) => ({
            name: speaker.name || '',
            title: speaker.title || '',
            bio: speaker.bio || '',
          }))
        : [],
    })

    tagsInput.value = Array.isArray(event.tags) ? event.tags.join(', ') : ''
    started.value = event.startDate
      ? new Date(event.startDate).getTime() <= Date.now()
      : false
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load this event.')
  } finally {
    loading.value = false
  }
}

const buildPayload = () => {
  const startDateTime = toISO(form.startDateTime)
  const endDateTime = toISO(form.endDateTime)

  const payload = {
    title: form.title.trim(),
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    category: form.category,
    hostBy: form.hostBy.trim(),
    status: form.status,
    visibility: form.visibility,
    timezone: form.timezone,
    capacity: Number(form.capacity),
    requireApproval: form.requireApproval,
    waitlistEnabled: form.waitlistEnabled,
    certificateEnabled: form.certificateEnabled,
    feedbackEnabled: form.feedbackEnabled,
    tags: tagsInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    venue: {
      name: form.venue.name.trim(),
      address: form.venue.address.trim(),
      city: form.venue.city.trim(),
      state: form.venue.state.trim(),
      country: form.venue.country,
    },
    speakers: form.speakers.filter((speaker) => speaker.name || speaker.title),
  }

  if (startDateTime) payload.startDateTime = startDateTime
  if (endDateTime) payload.endDateTime = endDateTime

  const registrationOpens = toISO(form.registrationOpens)
  const registrationCloses = toISO(form.registrationCloses)
  if (registrationOpens) payload.registrationOpens = registrationOpens
  if (registrationCloses) payload.registrationCloses = registrationCloses

  if (form.bannerImage && !bannerFile.value) {
    payload.bannerImage = form.bannerImage.trim()
  }

  return payload
}

const submit = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) {
    notifyError('Please correct the highlighted fields.')
    return
  }

  if (!isEdit.value && form.startDateTime) {
    const start = new Date(form.startDateTime)
    if (start.getTime() <= Date.now()) {
      notifyError('A new event must start in the future.')
      return
    }
  }

  saving.value = true
  error.value = null

  try {
    const payload = buildPayload()
    const event = isEdit.value
      ? await api.events.update(eventId.value, payload)
      : await api.events.create(payload)

    const id = event?._id || eventId.value
    const banner = Array.isArray(bannerFile.value)
      ? bannerFile.value[0]
      : bannerFile.value

    if (banner) {
      await api.events.uploadBanner(id, banner)
    }

    if (galleryFiles.value?.length) {
      await api.events.uploadGallery(id, galleryFiles.value)
    }

    notifySuccess(
      isEdit.value ? 'Event updated successfully.' : 'Event created successfully.'
    )
    router.push(`/events/${id}`)
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not save the event.')
    notifyError(error.value)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEdit.value) loadEvent()
})

defineExpose({ loading })
</script>

<style scoped>
.banner-preview {
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  overflow: hidden;
}

.speaker-row {
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 10px;
}
</style>
