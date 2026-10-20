<template>
  <v-app>
    <!-- Institutional Top Navigation - Deep Blue Background -->
    <v-app-bar app color="primary" elevation="1" height="64">
      <v-container class="d-flex align-center pa-0">
        <!-- meetCITAD Logo - Left -->
        <router-link to="/" class="d-flex align-center text-decoration-none header-logo">
          <v-img 
            :src="headerLogo" 
            max-height="40" 
            max-width="160" 
            contain
            class="mr-8"
          ></v-img>
        </router-link>
        
        <v-spacer></v-spacer>
        
        <!-- Main Navigation - Center -->
        <v-btn to="/events" variant="text" color="white" class="nav-link mx-2">Events</v-btn>
        
        <template v-if="isAuthenticated">
          <v-btn to="/my-events" variant="text" color="white" class="nav-link mx-2">My Events</v-btn>
          <v-btn to="/certificates" variant="text" color="white" class="nav-link mx-2">Certificates</v-btn>
          <v-btn to="/about" variant="text" color="white" class="nav-link mx-2">About CITAD</v-btn>
          
          <!-- Theme Toggle -->
          <v-btn icon @click="toggleTheme" color="white" class="ml-4">
            <v-icon>{{ theme.global.name.value === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
          </v-btn>

          <!-- Notifications -->
          <v-btn icon to="/notifications" color="white" class="ml-2" aria-label="Notifications">
            <v-badge
              :content="unreadCount > 9 ? '9+' : unreadCount"
              :model-value="unreadCount > 0"
              color="accent"
              offset-x="-2"
              offset-y="-2"
            >
              <v-icon>mdi-bell-outline</v-icon>
            </v-badge>
          </v-btn>
          
          <!-- User Menu -->
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn icon v-bind="props" color="white" class="ml-2">
                <v-icon>mdi-account-circle</v-icon>
              </v-btn>
            </template>
            
            <v-list min-width="200">
              <v-list-item :subtitle="currentUser?.email || 'User'">
                <v-list-item-title class="font-weight-medium">
                  {{ currentUser?.name || 'Account' }}
                </v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item to="/dashboard" prepend-icon="mdi-view-dashboard-outline">
                <v-list-item-title>Dashboard</v-list-item-title>
              </v-list-item>
              <v-list-item to="/profile" prepend-icon="mdi-account-edit">
                <v-list-item-title>Profile Settings</v-list-item-title>
              </v-list-item>
              <v-list-item to="/notifications" prepend-icon="mdi-bell-outline">
                <v-list-item-title>Notifications</v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item @click="handleLogout" prepend-icon="mdi-logout">
                <v-list-item-title>Logout</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
        
        <template v-else>
          <v-btn to="/about" variant="text" color="white" class="nav-link mx-2">About CITAD</v-btn>
          
          <!-- Theme Toggle -->
          <v-btn icon @click="toggleTheme" color="white" class="ml-4">
            <v-icon>{{ theme.global.name.value === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
          </v-btn>
        </template>
        
        <v-spacer></v-spacer>
        
        <!-- Sign In Button - Right -->
        <v-btn v-if="!isAuthenticated" to="/login" variant="flat" color="accent" class="ml-2">Sign In</v-btn>
      </v-container>
    </v-app-bar>

    <v-main>
      <v-alert
        v-if="!online"
        type="warning"
        variant="tonal"
        density="compact"
        rounded="0"
        icon="mdi-wifi-off"
        class="offline-banner"
      >
        You are offline. Saved tickets and events remain available, but live
        updates and actions will resume when you reconnect.
      </v-alert>
      <router-view />
    </v-main>

    <!-- Institutional Footer - Deep Blue Background -->
    <v-footer color="primary" class="py-10">
      <v-container>
        <v-row align="start" class="mb-6">
          <!-- meetCITAD Logo - Left -->
          <v-col cols="12" md="4" class="text-center text-md-left">
            <v-img 
              :src="footerLogo" 
              max-height="40" 
              max-width="160" 
              contain
              class="mb-3"
            ></v-img>
          </v-col>
          
          <!-- Center Links with Dividers -->
          <v-col cols="12" md="4" class="text-center">
            <div class="footer-links">
              <v-btn variant="text" size="small" to="/events" color="white" class="footer-link">Events</v-btn>
              <span class="footer-divider">|</span>
              <v-btn variant="text" size="small" to="/certificates" color="white" class="footer-link">Certificates</v-btn>
              <span class="footer-divider">|</span>
              <v-btn variant="text" size="small" to="/verify" color="white" class="footer-link">Verify Certificate</v-btn>
              <span class="footer-divider">|</span>
              <v-btn variant="text" size="small" to="/about" color="white" class="footer-link">About</v-btn>
            </div>
          </v-col>
          
          <!-- CITAD Logo - Right (Primary Brand) -->
          <v-col cols="12" md="4" class="text-center text-md-right">
            <v-img 
              :src="citadLogo" 
              max-height="60" 
              max-width="150" 
              contain
              class="ml-auto mr-auto mr-md-0 mb-3"
            ></v-img>
          </v-col>
        </v-row>
        
        <!-- Bottom Row: Organization Name & Social Links -->
        <v-row align="center" class="mt-4">
          <v-col cols="12" class="text-center">
            <p class="text-body-2 mb-3" style="color: rgba(255, 255, 255, 0.9);">
              Centre for Information Technology and Development
            </p>
            
            <!-- Social Media Icons -->
            <div class="social-links mb-3">
              <v-btn icon size="small" href="https://facebook.com/citadnigeria" target="_blank" color="white" class="mx-1">
                <v-icon size="20">mdi-facebook</v-icon>
              </v-btn>
              <v-btn icon size="small" href="https://twitter.com/citadnigeria" target="_blank" color="white" class="mx-1">
                <v-icon size="20">mdi-twitter</v-icon>
              </v-btn>
              <v-btn icon size="small" href="https://linkedin.com/company/citad" target="_blank" color="white" class="mx-1">
                <v-icon size="20">mdi-linkedin</v-icon>
              </v-btn>
              <v-btn icon size="small" href="https://citad.org" target="_blank" color="white" class="mx-1">
                <v-icon size="20">mdi-web</v-icon>
              </v-btn>
            </div>
            
            <p class="text-caption" style="color: rgba(255, 255, 255, 0.7);">
              &copy; {{ new Date().getFullYear() }} CITAD. All rights reserved.
            </p>
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
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'

// Import logo images
import logoLight from '@/assets/images/logo.png'
import logoDark from '@/assets/images/logo-white.png'
import logoSymbol from '@/assets/images/logo-symbol.png'
import citadLogo from '@/assets/images/citad-logo.png'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const theme = useTheme()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentUser = computed(() => authStore.currentUser)
const unreadCount = computed(() => notificationStore.unreadCount)

// Computed property for header logo (theme-aware)
const headerLogo = computed(() => {
  return theme.global.name.value === 'dark' ? logoDark : logoLight
})

// Computed property for footer logo (always white on blue background)
const footerLogo = computed(() => {
  return logoDark // Always use white logo on blue footer
})

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000,
})

const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

const updateOnlineStatus = () => {
  online.value = navigator.onLine
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})

// Theme toggle function
const toggleTheme = () => {
  theme.global.name.value = theme.global.name.value === 'light' ? 'dark' : 'light'
  // Save theme preference to localStorage
  localStorage.setItem('theme', theme.global.name.value)
}

// Load saved theme preference on mount
const savedTheme = localStorage.getItem('theme')
if (savedTheme) {
  theme.global.name.value = savedTheme
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/login')
    showSnackbar('Logout successful', 'success')
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
if (isAuthenticated.value) {
  if (!currentUser.value) {
    authStore.fetchProfile()
  }
  notificationStore.fetchUnreadCount()
}
</script>

<style scoped>
/* Brand Guidelines Compliance */

/* Header Logo - More Breathing Room */
.header-logo {
  padding-left: 8px;
  margin-right: 48px;
}

/* Logo Text Styling - "meet" lighter, "CITAD" bolder */
.logo-text {
  font-size: 1.125rem;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* Navigation Links - Subtle Active State (Institutional) */
.nav-link {
  position: relative;
  transition: opacity 0.2s ease;
}

.nav-link:hover {
  opacity: 0.85;
}

/* Subtle underline for active route - not boxy */
.nav-link.v-btn--active::after {
  content: '';
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background-color: currentColor;
  opacity: 0.9;
}

/* Ensure adequate spacing around logo */
.v-app-bar {
  padding: 0 16px;
}

/* Footer Styling */
.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.footer-link {
  text-transform: none;
  letter-spacing: 0;
}

.footer-divider {
  color: rgba(255, 255, 255, 0.5);
  margin: 0 8px;
  font-size: 14px;
}

.social-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.offline-banner {
  border-radius: 0;
}

/* Responsive Footer */
@media (max-width: 960px) {
  .footer-links {
    flex-direction: column;
    gap: 8px;
  }
  
  .footer-divider {
    display: none;
  }
}
</style>
