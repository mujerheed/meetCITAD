<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="admin-card" elevation="0">
      <v-card-title class="text-subtitle-1 font-weight-bold pt-5 px-6">
        {{ title }}
      </v-card-title>
      <v-card-text class="px-6 text-body-2 text-medium-emphasis">
        <slot>{{ message }}</slot>
      </v-card-text>
      <v-card-actions class="px-6 pb-5">
        <v-spacer></v-spacer>
        <v-btn variant="text" :disabled="loading" @click="cancel">Cancel</v-btn>
        <v-btn
          :color="color"
          variant="flat"
          :loading="loading"
          @click="$emit('confirm')"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Confirm action' },
  message: { type: String, default: 'Are you sure you want to continue?' },
  confirmText: { type: String, default: 'Confirm' },
  color: { type: String, default: 'primary' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const cancel = () => emit('update:modelValue', false)
</script>
