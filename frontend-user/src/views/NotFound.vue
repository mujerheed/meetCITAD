<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" class="text-center">
        <v-icon size="120" color="grey">mdi-alert-circle-outline</v-icon>
        <h1 class="text-h2 mt-4 mb-2">404</h1>
        <h2 class="text-h4 mb-6">Page Not Found</h2>
        <p class="text-h6 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <v-btn color="primary" size="large" to="/">
          <v-icon left>mdi-home</v-icon>
          Go Home
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// 404 Not Found Page
</script>
