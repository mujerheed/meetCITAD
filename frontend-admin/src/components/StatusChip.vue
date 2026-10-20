<template>
  <v-chip
    :color="config.color"
    :variant="variant"
    size="small"
    :prepend-icon="config.icon || undefined"
    class="text-capitalize"
  >
    {{ config.label }}
  </v-chip>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: 'draft' },
  variant: { type: String, default: 'tonal' },
})

const map = {
  published: { label: 'Published', color: 'success', icon: 'mdi-check-circle-outline' },
  draft: { label: 'Draft', color: 'grey', icon: 'mdi-pencil-outline' },
  ongoing: { label: 'Ongoing', color: 'info', icon: 'mdi-play-circle-outline' },
  completed: { label: 'Completed', color: 'primary', icon: 'mdi-flag-checkered' },
  cancelled: { label: 'Cancelled', color: 'error', icon: 'mdi-cancel' },
  active: { label: 'Active', color: 'success', icon: 'mdi-check-circle-outline' },
  inactive: { label: 'Inactive', color: 'grey', icon: 'mdi-pause-circle-outline' },
  suspended: { label: 'Suspended', color: 'warning', icon: 'mdi-alert-circle-outline' },
  deleted: { label: 'Deleted', color: 'error', icon: 'mdi-delete-outline' },
  revoked: { label: 'Revoked', color: 'error', icon: 'mdi-shield-off-outline' },
  expired: { label: 'Expired', color: 'warning', icon: 'mdi-clock-alert-outline' },
  pending: { label: 'Pending', color: 'warning', icon: 'mdi-clock-outline' },
  confirmed: { label: 'Confirmed', color: 'success', icon: 'mdi-check-outline' },
  attended: { label: 'Attended', color: 'success', icon: 'mdi-check-decagram' },
  absent: { label: 'Absent', color: 'grey', icon: 'mdi-account-off-outline' },
}

const config = computed(
  () =>
    map[String(props.status || '').toLowerCase()] || {
      label: props.status || 'Unknown',
      color: 'grey',
      icon: '',
    }
)
</script>
