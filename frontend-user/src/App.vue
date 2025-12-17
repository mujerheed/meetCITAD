<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-title>meetCITAD</v-app-bar-title>
      
      <v-spacer></v-spacer>
      
      <v-btn to="/" text>Home</v-btn>
      <v-btn to="/events" text>Events</v-btn>
      
      <template v-if="isAuthenticated">
        <v-btn to="/dashboard" text>Dashboard</v-btn>
        <v-btn to="/my-events" text>My Events</v-btn>
        
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props">
              <v-avatar size="32">
                <v-img v-if="currentUser?.profilePicture" :src="currentUser.profilePicture" />
                <v-icon v-else>mdi-account-circle</v-icon>
              </v-avatar>
            </v-btn>
          </template>
          
          <v-list>
            <v-list-item to="/profile">
              <v-list-item-title>Profile</v-list-item-title>
            </v-list-item>
            <v-list-item to="/certificates">
              <v-list-item-title>Certificates</v-list-item-title>
            </v-list-item>
            <v-list-item to="/notifications">
              <v-list-item-title>Notifications</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="handleLogout">
              <v-list-item-title>Logout</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
      
      <template v-else>
        <v-btn to="/login" text>Login</v-btn>
        <v-btn to="/signup" variant="outlined">Sign Up</v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <v-footer app>
      <v-container>
        <v-row>
          <v-col cols="12" class="text-center">
            &copy; {{ new Date().getFullYear() }} meetCITAD. All rights reserved.
          </v-col>
        </v-row>
      </v-container>
    </v-footer>

    <!-- Global snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="top right"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentUser = computed(() => authStore.currentUser)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000,
})

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/login')
    showSnackbar('Logged out successfully', 'success')
  } catch (error) {
    showSnackbar('Logout failed', 'error')
  }
}

const showSnackbar = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

// Fetch user profile on mount if authenticated
if (isAuthenticated.value && !currentUser.value) {
  authStore.fetchProfile()
}
</script>

<style scoped>
/* Add any global styles here */
</style>
