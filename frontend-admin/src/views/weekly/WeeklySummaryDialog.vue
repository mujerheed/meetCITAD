<template>
  <v-dialog
    :model-value="modelValue"
    max-width="880"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="admin-card" elevation="0">
      <v-card-title class="d-flex align-center pt-5 px-6">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Weekly summary</div>
          <div class="section-caption mt-1">
            Edit the text before sharing. Nothing is sent from this dialog.
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
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <v-btn-toggle v-model="format" mandatory density="comfortable" variant="outlined">
            <v-btn value="whatsapp" prepend-icon="mdi-whatsapp">WhatsApp</v-btn>
            <v-btn value="email" prepend-icon="mdi-email-outline">Email</v-btn>
          </v-btn-toggle>
          <v-chip size="small" variant="tonal" color="primary">
            {{ activityCount }} public activit{{ activityCount === 1 ? 'y' : 'ies' }}
          </v-chip>
          <v-progress-circular
            v-if="loading"
            indeterminate
            size="20"
            width="2"
          ></v-progress-circular>
        </div>

        <v-alert
          v-for="warning in warnings"
          :key="warning"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          {{ warning }}
        </v-alert>

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-3"
          closable
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>

        <v-textarea
          v-model="text"
          label="Shareable summary"
          variant="outlined"
          rows="20"
          class="summary-text"
          :disabled="loading"
          hide-details
        ></v-textarea>

        <div class="section-caption mt-2">
          The summary only includes published activities with public visibility.
          Signed-in-only and staff-only activities are excluded.
        </div>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="px-6 py-4 flex-wrap ga-2">
        <v-btn
          variant="text"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="load"
        >
          Regenerate
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-content-copy"
          :disabled="loading || !text"
          @click="copy"
        >
          Copy
        </v-btn>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-download-outline"
          :disabled="loading || !text"
          @click="downloadTxt"
        >
          Download TXT
        </v-btn>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-file-code-outline"
          :disabled="loading"
          @click="downloadHtml"
        >
          Download HTML
        </v-btn>
        <v-btn
          color="accent"
          variant="flat"
          elevation="0"
          prepend-icon="mdi-printer-outline"
          :disabled="loading || !text"
          @click="printSummary"
        >
          Print / Save PDF
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import api, { getErrorMessage } from '@/api'
import { downloadBlob, downloadText } from '@/utils/download'
import { summaryFilename } from '@/utils/weekly'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  program: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])
const format = ref('whatsapp')
const text = ref('')
const warnings = ref([])
const activityCount = ref(0)
const loading = ref(false)
const error = ref(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) load()
  }
)

watch(format, () => {
  if (props.modelValue) load()
})

async function load() {
  if (!props.program?.id) return
  loading.value = true
  error.value = null
  try {
    const data = await api.weeklyPrograms.summary(props.program.id, format.value)
    text.value = data.text || ''
    warnings.value = data.warnings || []
    activityCount.value = data.activityCount || 0
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not generate the weekly summary.')
  } finally {
    loading.value = false
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(text.value)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
}

function downloadTxt() {
  downloadText(text.value, summaryFilename(props.program?.weekStart, 'txt'))
}

async function downloadHtml() {
  if (!props.program?.id) return
  try {
    const response = await api.weeklyPrograms.exportSummary(props.program.id, 'html')
    downloadBlob(
      response.data,
      summaryFilename(props.program?.weekStart, 'html')
    )
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not export the summary.')
  }
}

function printSummary() {
  const escaped = text.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const win = window.open('', '_blank')
  if (!win) {
    error.value = 'Allow pop-ups for this site to print or save the summary as PDF.'
    return
  }

  win.document.write(`<!DOCTYPE html>
    <html><head><meta charset="utf-8" /><title>CITAD Weekly Summary</title>
    <style>
      body { font-family: Arial, sans-serif; color: #1f2937; padding: 32px; line-height: 1.6; }
      pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 12pt; }
      @media print { body { padding: 0; } }
    </style></head><body><pre>${escaped}</pre></body></html>`)
  win.document.close()
  win.focus()
  win.print()
}
</script>

<style scoped>
.summary-text :deep(textarea) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.82rem;
  line-height: 1.55;
}
</style>
