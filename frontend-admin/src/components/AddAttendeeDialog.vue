<template>
  <v-dialog
    :model-value="modelValue"
    max-width="580"
    :persistent="loading"
    @update:model-value="handleVisibility"
  >
    <v-card class="admin-card" elevation="0">
      <v-card-title class="dialog-title">Add attendee</v-card-title>
      <v-card-subtitle v-if="eventTitle" class="dialog-subtitle">
        {{ eventTitle }}
      </v-card-subtitle>

      <v-card-text>
        <p class="dialog-intro">
          Use this for someone who did not register through the participant app.
          Existing accounts are matched by email address.
        </p>

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          density="comfortable"
          class="mb-4"
        >
          {{ error }}
        </v-alert>

        <v-form ref="formRef" @submit.prevent="submit">
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="form.fullname"
                label="Full name"
                placeholder="e.g. Aisha Muhammad"
                variant="outlined"
                density="comfortable"
                autocomplete="name"
                :rules="nameRules"
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.email"
                label="Email address"
                placeholder="name@example.com"
                type="email"
                variant="outlined"
                density="comfortable"
                autocomplete="email"
                :rules="emailRules"
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.phone"
                label="Phone number (optional)"
                placeholder="08012345678"
                type="tel"
                inputmode="tel"
                variant="outlined"
                density="comfortable"
                autocomplete="tel"
                :rules="phoneRules"
              ></v-text-field>
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="form.organisation"
                label="Organisation (optional)"
                variant="outlined"
                density="comfortable"
                autocomplete="organization"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-checkbox
            v-model="form.checkInNow"
            color="primary"
            density="comfortable"
            hide-details
            label="Check this attendee in now"
          ></v-checkbox>
          <p class="dialog-hint">
            Leave unchecked to register them without recording attendance.
          </p>
        </v-form>
      </v-card-text>

      <v-card-actions class="px-6 pb-5">
        <v-spacer></v-spacer>
        <v-btn variant="text" :disabled="loading" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          elevation="0"
          prepend-icon="mdi-account-plus-outline"
          :loading="loading"
          @click="submit"
        >
          Add attendee
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { nextTick, reactive, ref, watch } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  eventId: { type: String, default: '' },
  eventTitle: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'added'])
const { notifySuccess } = useSnackbar()

const formRef = ref(null)
const loading = ref(false)
const error = ref(null)

const form = reactive({
  fullname: '',
  email: '',
  phone: '',
  organisation: '',
  checkInNow: true,
})

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const nameRules = [
  (value) =>
    String(value || '').trim().length >= 3 ||
    'Enter the attendee’s full name (at least 3 characters).',
]

const emailRules = [
  (value) =>
    emailPattern.test(String(value || '').trim()) ||
    'Enter a valid email address.',
]

const phoneRules = [
  (value) =>
    !value ||
    /^[0-9]{10,15}$/.test(String(value).replace(/[\s\-()]/g, '')) ||
    'Enter a valid phone number.',
]

const resetForm = () => {
  form.fullname = ''
  form.email = ''
  form.phone = ''
  form.organisation = ''
  form.checkInNow = true
  error.value = null
  nextTick(() => formRef.value?.resetValidation())
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) resetForm()
  }
)

const close = () => {
  if (loading.value) return
  emit('update:modelValue', false)
}

const handleVisibility = (visible) => {
  if (!visible) close()
}

const submit = async () => {
  if (loading.value) return

  const validation = await formRef.value?.validate()
  if (!validation?.valid) return

  if (!props.eventId) {
    error.value = 'Select an event before adding an attendee.'
    return
  }

  loading.value = true
  error.value = null

  try {
    const result = await api.attendance.addAttendee(props.eventId, {
      fullname: form.fullname.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      organisation: form.organisation.trim() || undefined,
      checkInNow: form.checkInNow,
    })

    const attendeeName = result.attendee?.fullname || form.fullname.trim()
    let message = result.message || `${attendeeName} added.`

    if (!result.createdUser && result.alreadyRegistered) {
      message += ' Existing participant account matched by email.'
    }
    if (result.overCapacity) {
      message += ' The event is now over capacity.'
    }

    notifySuccess(message)
    emit('added', result)
    emit('update:modelValue', false)
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not add this attendee.')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dialog-title {
  padding: 24px 24px 2px;
  font-size: 1.1rem;
  font-weight: 700;
}

.dialog-subtitle {
  padding: 0 24px 8px;
  font-size: 0.8rem;
  opacity: 0.75;
}

.dialog-intro {
  margin-bottom: 18px;
  font-size: 0.84rem;
  line-height: 1.55;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.dialog-hint {
  margin-top: 2px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
