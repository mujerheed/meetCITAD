<template>
  <v-dialog
    :model-value="modelValue"
    max-width="620"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="admin-card" elevation="0">
      <v-card-title class="d-flex align-center pt-5 px-6">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Notify participants</div>
          <div class="section-caption mt-1">
            Publishing never sends notifications automatically. Confirm the audience
            and channels below.
          </div>
        </div>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close"
          :disabled="sending"
          @click="close"
        ></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="px-6 py-5">
        <v-alert
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-5"
          icon="mdi-alert-outline"
        >
          Only send this after the weekly schedule is final. Notifications cannot be
          automatically unsent.
        </v-alert>

        <v-radio-group v-model="audience" label="Audience" class="mb-2">
          <v-radio value="all_active" label="All active participant accounts"></v-radio>
          <v-radio
            value="registered"
            label="Participants registered for linked events this week"
          ></v-radio>
        </v-radio-group>

        <div class="section-title mb-2">Channels</div>
        <v-checkbox
          v-model="channels"
          value="inApp"
          label="In-app notification"
          density="compact"
          hide-details
        ></v-checkbox>
        <v-checkbox
          v-model="channels"
          value="email"
          label="Email (sent only when email delivery is configured)"
          density="compact"
          hide-details
        ></v-checkbox>

        <v-checkbox
          v-model="confirmed"
          class="mt-4"
          color="warning"
          label="I have confirmed the audience and want to send this notification."
          hide-details
        ></v-checkbox>

        <v-alert
          v-if="result"
          type="success"
          variant="tonal"
          density="compact"
          class="mt-4"
        >
          Queued for {{ result.requested }} recipient(s): {{ result.sent }} sent,
          {{ result.failed }} failed.
        </v-alert>

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-4"
          closable
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="px-6 py-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" :disabled="sending" @click="close">Cancel</v-btn>
        <v-btn
          color="warning"
          variant="flat"
          elevation="0"
          prepend-icon="mdi-send-outline"
          :loading="sending"
          :disabled="!confirmed || channels.length === 0"
          @click="send"
        >
          Send notification
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import api, { getErrorMessage } from '@/api'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  program: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'sent'])
const audience = ref('all_active')
const channels = ref(['inApp'])
const confirmed = ref(false)
const sending = ref(false)
const error = ref(null)
const result = ref(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      audience.value = 'all_active'
      channels.value = ['inApp']
      confirmed.value = false
      error.value = null
      result.value = null
    }
  }
)

async function send() {
  if (!props.program?.id || !confirmed.value) return
  sending.value = true
  error.value = null
  try {
    result.value = await api.weeklyPrograms.notify(props.program.id, {
      recipients: audience.value,
      channels: channels.value,
      confirm: true,
    })
    emit('sent', result.value)
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not send the notification.')
  } finally {
    sending.value = false
  }
}

function close() {
  if (sending.value) return
  emit('update:modelValue', false)
}
</script>
