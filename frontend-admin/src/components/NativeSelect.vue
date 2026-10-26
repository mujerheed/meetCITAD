<template>
  <div class="native-select-field">
    <label v-if="label" class="native-select-label" :for="selectId">
      {{ label }}
    </label>

    <div class="native-select-control">
      <select
        :id="selectId"
        v-model="selected"
        class="native-select"
        :disabled="disabled"
      >
        <option v-if="placeholder" :value="null" disabled>
          {{ placeholder }}
        </option>
        <option
          v-for="item in normalizedItems"
          :key="String(item.value)"
          :value="item.value"
        >
          {{ item.title }}
        </option>
      </select>
      <v-icon class="native-select-caret" size="20" aria-hidden="true">
        mdi-menu-down
      </v-icon>
    </div>

    <div v-if="hint" class="native-select-hint">{{ hint }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

let nextId = 0

const props = defineProps({
  modelValue: { default: null },
  items: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const selectId = `native-select-${++nextId}`

const normalizedItems = computed(() =>
  props.items.map((item) =>
    item && typeof item === 'object'
      ? {
          title: item.title ?? item.label ?? item.name ?? String(item.value),
          value: item.value,
        }
      : { title: String(item), value: item }
  )
)

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<style scoped>
.native-select-field {
  width: 100%;
}

.native-select-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.native-select-control {
  position: relative;
}

.native-select {
  width: 100%;
  height: 52px;
  padding: 0 44px 0 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.38);
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font: inherit;
  font-size: 0.94rem;
  appearance: none;
  cursor: pointer;
}

.native-select:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.62);
}

.native-select:focus {
  outline: none;
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

.native-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.native-select-caret {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  pointer-events: none;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.native-select-hint {
  margin-top: 4px;
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
