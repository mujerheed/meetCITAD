<template>
  <v-app>
    <!-- Institutional top navigation -->
    <v-app-bar app color="primary" elevation="0" height="72" class="site-header">
      <v-container class="header-content d-flex align-center pa-0">
        <router-link to="/" class="brand-link" aria-label="meetCITAD home">
          <v-img :src="logoWhite" alt="meetCITAD" class="brand-logo" contain />
        </router-link>

        <v-spacer />

        <nav v-if="!mdAndDown" class="desktop-nav" aria-label="Primary navigation">
          <v-btn to="/events" variant="text" class="nav-link">Events</v-btn>
          <v-btn to="/weekly" variant="text" class="nav-link">Weekly</v-btn>
          <v-btn to="/about" variant="text" class="nav-link">About CITAD</v-btn>
          <template v-if="isAuthenticated">
            <v-btn to="/my-events" variant="text" class="nav-link">My Events</v-btn>
            <v-btn to="/certificates" variant="text" class="nav-link">Certificates</v-btn>
          </template>
        </nav>

        <div class="header-actions d-flex align-center">
          <v-btn
            icon
            variant="text"
            class="header-icon-btn"
            :aria-label="theme.global.name.value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
            @click="toggleTheme"
          >
            <v-icon>
              {{ theme.global.name.value === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}
            </v-icon>
          </v-btn>

          <template v-if="isAuthenticated && !mdAndDown">
            <v-btn
              icon
              variant="text"
              to="/notifications"
              class="header-icon-btn"
              aria-label="Notifications"
            >
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

            <v-menu location="bottom end">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  variant="text"
                  class="header-icon-btn ml-1"
                  aria-label="Account menu"
                >
                  <v-avatar size="34" color="accent" class="account-avatar">
                    <span class="account-initials">{{ authStore.userInitials || 'U' }}</span>
                  </v-avatar>
                </v-btn>
              </template>

              <v-list min-width="230" class="account-menu">
                <v-list-item :subtitle="currentUser?.email || 'Participant'">
                  <v-list-item-title class="font-weight-medium">
                    {{ authStore.displayName }}
                  </v-list-item-title>
                </v-list-item>
                <v-divider />
                <v-list-item to="/dashboard" prepend-icon="mdi-view-dashboard-outline" title="Dashboard" />
                <v-list-item to="/profile" prepend-icon="mdi-account-edit-outline" title="Profile Settings" />
                <v-list-item to="/notifications" prepend-icon="mdi-bell-outline" title="Notifications" />
                <v-divider />
                <v-list-item
                  prepend-icon="mdi-logout"
                  title="Logout"
                  @click="handleLogout"
                />
              </v-list>
            </v-menu>
          </template>

          <template v-else-if="!isAuthenticated && !mdAndDown">
            <v-btn :to="loginLink" variant="text" class="header-text-btn">Sign In</v-btn>
            <v-btn :to="signupLink" color="accent" variant="flat" class="header-cta">
              Create Account
            </v-btn>
          </template>

          <v-btn
            v-if="mdAndDown"
            icon
            variant="text"
            class="header-icon-btn ml-1"
            aria-label="Open navigation menu"
            @click="drawer = !drawer"
          >
            <v-icon>mdi-menu</v-icon>
          </v-btn>
        </div>
      </v-container>
    </v-app-bar>

    <!-- Mobile navigation -->
    <v-navigation-drawer v-model="drawer" temporary location="right" width="310" class="site-drawer">
      <div class="drawer-brand">
        <v-img :src="logoWhite" alt="meetCITAD" max-width="150" contain />
        <v-btn icon variant="text" color="white" aria-label="Close menu" @click="drawer = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <v-list nav class="drawer-list">
        <v-list-item
          v-for="item in drawerLinks"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          @click="drawer = false"
        />
      </v-list>

      <div class="drawer-actions">
        <template v-if="isAuthenticated">
          <div class="drawer-user">
            <v-avatar size="38" color="accent" class="account-avatar">
              <span class="account-initials">{{ authStore.userInitials || 'U' }}</span>
            </v-avatar>
            <div class="drawer-user-copy">
              <div class="font-weight-medium">{{ authStore.displayName }}</div>
              <div class="text-caption text-medium-emphasis">{{ currentUser?.email }}</div>
            </div>
          </div>
          <v-btn block variant="outlined" color="error" prepend-icon="mdi-logout" @click="handleLogout">
            Logout
          </v-btn>
        </template>
        <template v-else>
          <v-btn block variant="outlined" color="primary" :to="loginLink" @click="drawer = false">
            Sign In
          </v-btn>
          <v-btn block color="accent" variant="flat" :to="signupLink" @click="drawer = false">
            Create Account
          </v-btn>
        </template>
      </div>
    </v-navigation-drawer>

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

    <!-- Institutional footer -->
    <v-footer class="site-footer">
      <v-container class="py-12">
        <v-row class="footer-grid">
          <v-col cols="12" md="4" class="footer-brand-col">
            <v-img :src="logoWhite" alt="meetCITAD" max-width="190" contain class="footer-brand" />
            <p class="footer-description">
              CITAD's event attendance platform for discovering programmes, registering
              for events, checking in with QR tickets, and receiving verified
              certificates.
            </p>
            <div class="social-links">
              <a
                v-for="link in citad.socialLinks"
                :key="link.url"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="link.label"
              >
                <v-icon size="18">{{ link.icon }}</v-icon>
              </a>
            </div>
          </v-col>

          <v-col cols="12" sm="4" md="2" class="footer-link-col">
            <h3 class="footer-heading">Explore</h3>
            <router-link to="/events" class="footer-link">Events</router-link>
            <router-link to="/weekly" class="footer-link">Weekly Programme</router-link>
            <router-link to="/about" class="footer-link">About CITAD</router-link>
            <router-link to="/verify" class="footer-link">Verify Certificate</router-link>
            <router-link v-if="!isAuthenticated" :to="signupLink" class="footer-link">Create Account</router-link>
            <router-link v-else to="/my-events" class="footer-link">My Events</router-link>
            <a :href="citad.contactUrl" target="_blank" rel="noopener noreferrer" class="footer-link">
              CITAD contact page
            </a>
          </v-col>

          <v-col cols="12" sm="8" md="4" class="footer-contact-col">
            <h3 class="footer-heading">CITAD contact</h3>
            <div class="footer-contact-item">
              <v-icon size="18">mdi-map-marker-outline</v-icon>
              <span>Head office: {{ citad.headOfficeAddress }}</span>
            </div>
            <div class="footer-contact-item">
              <v-icon size="18">mdi-email-outline</v-icon>
              <a :href="`mailto:${citad.email}`">{{ citad.email }}</a>
            </div>
            <div class="footer-contact-item">
              <v-icon size="18">mdi-phone-outline</v-icon>
              <a :href="`tel:${citad.phone}`">{{ citad.phone }}</a>
            </div>
            <div class="footer-contact-item">
              <v-icon size="18">mdi-clock-outline</v-icon>
              <span>{{ citad.openingHours }}</span>
            </div>
            <div class="footer-contact-item">
              <v-icon size="18">mdi-web</v-icon>
              <a :href="citad.website" target="_blank" rel="noopener noreferrer">{{ citad.websiteLabel }}</a>
            </div>
          </v-col>

          <v-col cols="12" md="2" class="footer-institution-col">
            <v-img
              :src="citadLogo"
              :alt="citad.name"
              max-width="180"
              contain
              class="footer-citad-logo"
            />
          </v-col>
        </v-row>

        <v-divider class="footer-rule my-8" />

        <div class="footer-bottom">
          <span>&copy; {{ new Date().getFullYear() }} CITAD. All rights reserved.</span>
          <span>{{ citad.name }}</span>
        </div>
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
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import logoWhite from '@/assets/images/logo-white-transparent.png'
import citadLogo from '@/assets/images/citad-logo-transparent.png'
import { citad } from '@/utils/citad'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const theme = useTheme()
const { mdAndDown } = useDisplay()

const drawer = ref(false)
const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentUser = computed(() => authStore.currentUser)
const unreadCount = computed(() => notificationStore.unreadCount)

const publicLinks = [
  { title: 'Home', to: '/', icon: 'mdi-home-outline' },
  { title: 'Events', to: '/events', icon: 'mdi-calendar-text-outline' },
  { title: 'Weekly Programme', to: '/weekly', icon: 'mdi-calendar-week-outline' },
  { title: 'About CITAD', to: '/about', icon: 'mdi-information-outline' },
]

const memberLinks = [
  { title: 'Dashboard', to: '/dashboard', icon: 'mdi-view-dashboard-outline' },
  { title: 'My Events', to: '/my-events', icon: 'mdi-calendar-check-outline' },
  { title: 'Certificates', to: '/certificates', icon: 'mdi-certificate-outline' },
  { title: 'Notifications', to: '/notifications', icon: 'mdi-bell-outline' },
  { title: 'Profile', to: '/profile', icon: 'mdi-account-edit-outline' },
]

const drawerLinks = computed(() =>
  isAuthenticated.value ? [...publicLinks, ...memberLinks] : publicLinks
)

const redirectableRoutes = [
  'EventDetails',
  'EventFeedback',
  'WeeklySchedule',
  'WeeklyActivityDetails',
]

const redirectQuery = computed(() =>
  redirectableRoutes.includes(route.name) ? { redirect: route.fullPath } : {}
)

const loginLink = computed(() => ({ name: 'Login', query: redirectQuery.value }))
const signupLink = computed(() => ({ name: 'Signup', query: redirectQuery.value }))

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

const toggleTheme = () => {
  theme.global.name.value = theme.global.name.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.global.name.value)
}

const savedTheme = localStorage.getItem('theme')
if (savedTheme) {
  theme.global.name.value = savedTheme
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    drawer.value = false
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

if (isAuthenticated.value) {
  if (!currentUser.value) {
    authStore.fetchProfile()
  }
  notificationStore.fetchUnreadCount()
}
</script>

<style scoped>
/* ------------------------------------------------ Header */
.site-header {
  background: #0f2a44 !important;
  border-bottom: 1px solid rgba(201, 164, 76, 0.38);
}

.header-content {
  max-width: 1280px;
}

.brand-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  flex: 0 0 auto;
}

.brand-logo {
  width: 170px;
  max-width: 38vw;
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: 2px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.82);
  text-transform: none;
  letter-spacing: 0.01em;
  font-weight: 500;
  font-size: 0.9rem;
  border-radius: 6px;
  padding-inline: 14px;
}

.nav-link:hover,
.nav-link.v-btn--active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.nav-link.v-btn--active::after {
  content: '';
  position: absolute;
  bottom: 7px;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 2px;
  background: #c9a44c;
}

.header-actions {
  gap: 4px;
}

.header-icon-btn {
  color: rgba(255, 255, 255, 0.9);
}

.header-text-btn {
  color: #ffffff;
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0;
}

.header-cta {
  color: #0f2a44 !important;
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0;
  padding-inline: 18px;
}

.account-avatar {
  border: 1px solid rgba(255, 255, 255, 0.45);
}

.account-initials {
  color: #0f2a44;
  font-size: 0.76rem;
  font-weight: 700;
}

.account-menu {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* ------------------------------------------------ Mobile drawer */
.site-drawer :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
}

.drawer-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0f2a44;
  padding: 20px 18px;
}

.drawer-list {
  flex: 1;
  padding-top: 10px;
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.drawer-user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.drawer-user-copy {
  min-width: 0;
}

.drawer-user-copy .text-caption {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ------------------------------------------------ Footer */
.site-footer {
  background: #0f2a44;
  color: rgba(255, 255, 255, 0.76);
  padding: 0;
}

.footer-brand {
  margin-bottom: 20px;
}

.footer-description {
  max-width: 380px;
  font-size: 0.9rem;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.72);
}

.footer-heading {
  margin-bottom: 18px;
  color: #ffffff;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.footer-link-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.footer-link {
  color: rgba(255, 255, 255, 0.74);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.footer-link:hover,
.footer-contact-item a:hover {
  color: #ffffff;
}

.footer-contact-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.footer-contact-item .v-icon {
  color: #c9a44c;
  flex: 0 0 auto;
  margin-top: 1px;
}

.footer-contact-item a {
  color: rgba(255, 255, 255, 0.74);
  text-decoration: none;
}

.footer-contact-item span,
.footer-contact-item a {
  min-width: 0;
  overflow-wrap: anywhere;
}

.footer-institution-col {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-top: 4px;
}

.footer-citad-logo {
  width: 100%;
  filter: brightness(0) invert(1);
  opacity: 0.9;
}

.social-links {
  display: flex;
  align-items: center;
  gap: 10px;
}

.social-links a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.8);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.social-links a:hover {
  border-color: #c9a44c;
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
}

.footer-rule {
  border-color: rgba(255, 255, 255, 0.14) !important;
  opacity: 1;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.56);
}

.offline-banner {
  border-radius: 0;
}

@media (max-width: 960px) {
  .brand-logo {
    width: 150px;
  }

  .footer-bottom {
    flex-direction: column;
    text-align: center;
  }

  .footer-brand-col,
  .footer-contact-col {
    text-align: center;
  }

  .footer-brand {
    margin-inline: auto;
  }

  .footer-description {
    margin-inline: auto;
  }

  .social-links {
    justify-content: center;
  }

  .footer-link-col {
    align-items: center;
    text-align: center;
  }

  .footer-contact-item {
    justify-content: center;
    text-align: left;
  }

  .footer-institution-col {
    align-items: center;
    justify-content: center;
    padding-top: 0;
  }
}

@media (max-width: 600px) {
  .brand-logo {
    width: 132px;
  }

  .footer-grid {
    row-gap: 26px;
  }
}
</style>
