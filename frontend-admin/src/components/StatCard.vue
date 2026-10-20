<template>
  <v-card class="stat-card" elevation="0">
    <v-card-text class="pa-5">
      <div class="d-flex align-start justify-space-between ga-3">
        <div class="flex-grow-1">
          <div class="stat-label">{{ label }}</div>
          <div v-if="loading" class="mt-3">
            <v-skeleton-loader type="text" width="90" class="pa-0"></v-skeleton-loader>
          </div>
          <div v-else class="stat-value mt-2">{{ value }}</div>
          <div v-if="caption" class="stat-caption mt-1">{{ caption }}</div>
        </div>

        <div class="stat-icon" :style="{ background: tint, color: color }">
          <v-icon size="22">{{ icon }}</v-icon>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  caption: { type: String, default: '' },
  icon: { type: String, default: 'mdi-chart-box-outline' },
  color: { type: String, default: '#0F2A44' },
  loading: { type: Boolean, default: false },
})

const tint = computed(() => {
  const colors = {
    '#0F2A44': 'rgba(15, 42, 68, 0.07)',
    '#059669': 'rgba(5, 150, 105, 0.1)',
    '#C9A44C': 'rgba(201, 164, 76, 0.14)',
    '#DC2626': 'rgba(220, 38, 38, 0.1)',
    '#D97706': 'rgba(217, 119, 6, 0.12)',
  }
  return colors[props.color] || 'rgba(15, 42, 68, 0.07)'
})
</script>
