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

        <div class="stat-icon" :style="{ background: tint, color: displayColor }">
          <v-icon size="22">{{ icon }}</v-icon>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from 'vuetify'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  caption: { type: String, default: '' },
  icon: { type: String, default: 'mdi-chart-box-outline' },
  color: { type: String, default: '#0F2A44' },
  loading: { type: Boolean, default: false },
})

const theme = useTheme()
const isDark = computed(() => theme.global.name.value === 'dark')

const darkColorMap = {
  '#0F2A44': '#9DBBDD',
  '#059669': '#34D399',
  '#C9A44C': '#E2C47A',
  '#DC2626': '#F87171',
  '#D97706': '#FBBF24',
}

const darkTintMap = {
  '#0F2A44': 'rgba(157, 187, 221, 0.16)',
  '#059669': 'rgba(52, 211, 153, 0.16)',
  '#C9A44C': 'rgba(226, 196, 122, 0.16)',
  '#DC2626': 'rgba(248, 113, 113, 0.16)',
  '#D97706': 'rgba(251, 191, 36, 0.16)',
}

const displayColor = computed(() =>
  isDark.value ? darkColorMap[props.color] || props.color : props.color
)

const tint = computed(() => {
  if (isDark.value) {
    return darkTintMap[props.color] || 'rgba(157, 187, 221, 0.16)'
  }

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
