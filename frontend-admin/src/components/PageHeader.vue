<template>
  <div class="page-header">
    <div class="d-flex align-start ga-3">
      <div v-if="icon" class="page-icon">
        <v-icon size="22">{{ icon }}</v-icon>
      </div>
      <div>
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <div v-if="$slots.actions" class="d-flex flex-wrap align-center ga-2 no-print">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
})
</script>

<style scoped>
.page-icon {
  width: 42px;
  height: 42px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 42, 68, 0.06);
  color: rgb(var(--v-theme-primary));
  flex-shrink: 0;
}

.v-theme--dark .page-icon {
  background: rgba(201, 164, 76, 0.14);
  color: #e9d7a7;
}
</style>
