<template>
  <v-app>
    <router-view />

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="top right"
      elevation="2"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { useSnackbar } from '@/composables/useSnackbar'

const { snackbar } = useSnackbar()
</script>
