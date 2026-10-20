<template>
  <div class="empty-state">
    <v-icon size="56" color="grey-lighten-1" class="mb-3">{{ icon }}</v-icon>
    <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ title }}</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">{{ message }}</p>
    <slot name="action" />
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: 'mdi-inbox-outline' },
  title: { type: String, default: 'Nothing here yet' },
  message: { type: String, default: 'There is no data to display.' },
})
</script>
