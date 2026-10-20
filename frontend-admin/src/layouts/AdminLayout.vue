<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail && !mobile"
    :temporary="mobile"
    :permanent="!mobile"
    width="268"
    rail-width="76"
    class="admin-drawer"
  >
    <div class="brand-block" :class="{ 'brand-block--rail': rail && !mobile }">
      <img
        :src="logo"
        alt="meetCITAD"
        class="brand-mark"
        @click="goToDashboard"
      />
      <div v-if="!rail || mobile" class="brand-text">
        <div class="brand-name">meetCITAD</div>
        <div class="brand-subtitle">Administration</div>
      </div>
    </div>

    <v-divider class="drawer-divider"></v-divider>

    <div class="drawer-nav">
      <template v-for="group in visibleGroups" :key="group.label">
        <div v-if="!rail || mobile" class="nav-section-label">
          {{ group.label }}
        </div>
        <v-list density="compact" nav class="py-0">
          <v-list-item
            v-for="item in group.items"
            :key="item.name"
            :to="item.to"
            :prepend-icon="item.icon"
            :active="isActive(item)"
            color="primary"
            class="nav-item"
            :title="rail && !mobile ? undefined : item.title"
          >
            <template #title>
              <span v-if="!rail || mobile">{{ item.title }}</span>
            </template>
          </v-list-item>
        </v-list>
      </template>
    </div>

    <template #append>
      <v-divider class="drawer-divider"></v-divider>
      <div class="drawer-footer" :class="{ 'drawer-footer--rail': rail && !mobile }">
        <v-avatar size="34" color="primary" class="text-white font-weight-bold">
          {{ auth.initials || 'A' }}
        </v-avatar>
        <div v-if="!rail || mobile" class="footer-identity">
          <div class="footer-name">{{ auth.displayName }}</div>
          <div class="footer-role">{{ auth.roleLabel }}</div>
        </div>
        <v-btn
          v-if="!rail || mobile"
          icon="mdi-logout"
          size="small"
          variant="text"
          aria-label="Sign out"
          @click="signOut"
        ></v-btn>
      </div>
    </template>
  </v-navigation-drawer>

  <v-app-bar flat height="64" class="admin-appbar">
    <v-app-bar-nav-icon
      :aria-label="mobile ? 'Open navigation' : 'Collapse navigation'"
      @click="toggleDrawer"
    ></v-app-bar-nav-icon>

    <div class="appbar-title">
      <div class="appbar-eyebrow">{{ breadcrumb }}</div>
      <div class="appbar-heading">{{ pageTitle }}</div>
    </div>

    <v-spacer></v-spacer>

    <v-chip
      v-if="!online"
      color="warning"
      variant="tonal"
      size="small"
      prepend-icon="mdi-wifi-off"
      class="mr-2 d-none d-sm-flex"
    >
      Offline
    </v-chip>

    <v-btn
      :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
      variant="text"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="toggleTheme"
    ></v-btn>

    <v-menu location="bottom end">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon="mdi-account-circle-outline"
          variant="text"
          aria-label="Account menu"
          class="d-none d-sm-flex"
        ></v-btn>
      </template>

      <v-list density="compact" min-width="220">
        <v-list-item
          :subtitle="auth.currentAdmin?.email || ''"
          :title="auth.displayName"
        ></v-list-item>
        <v-divider></v-divider>
        <v-list-item
          v-if="auth.can('manage_settings')"
          prepend-icon="mdi-cog-outline"
          title="Settings"
          to="/settings"
        ></v-list-item>
        <v-list-item
          prepend-icon="mdi-logout"
          title="Sign out"
          @click="signOut"
        ></v-list-item>
      </v-list>
    </v-menu>
  </v-app-bar>

  <v-main class="admin-main">
    <v-alert
      v-if="!online"
      type="warning"
      variant="tonal"
      density="compact"
      rounded="0"
      icon="mdi-wifi-off"
      class="offline-banner"
    >
      You are offline. Scans can be queued in the scanner, but live updates
      will resume when the connection returns.
    </v-alert>

    <div class="admin-content">
      <router-view />
    </div>
  </v-main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import logo from '@/assets/images/logo-symbol.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const theme = useTheme()
const { mobile } = useDisplay()

const drawer = ref(true)
const rail = ref(false)
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

const isDark = computed(() => theme.global.name.value === 'dark')
const pageTitle = computed(() => route.meta.title || 'Administration')
const breadcrumb = computed(() => {
  if (route.meta.parent) return `Administration / ${route.meta.parent}`
  if (route.name === 'Dashboard') return 'CITAD meetCITAD'
  return 'Administration'
})

const groups = [
  {
    label: 'Overview',
    items: [
      {
        name: 'Dashboard',
        title: 'Dashboard',
        icon: 'mdi-view-dashboard-outline',
        to: '/',
        permission: 'view_analytics',
      },
    ],
  },
  {
    label: 'Events',
    items: [
      {
        name: 'Events',
        title: 'Events',
        icon: 'mdi-calendar-text-outline',
        to: '/events',
        match: ['/events'],
      },
      {
        name: 'Attendance',
        title: 'Attendance',
        icon: 'mdi-account-check-outline',
        to: '/attendance',
      },
      {
        name: 'Scanner',
        title: 'QR Scanner',
        icon: 'mdi-qrcode-scan',
        to: '/scanner',
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        name: 'Users',
        title: 'Users',
        icon: 'mdi-account-group-outline',
        to: '/users',
        permission: 'manage_users',
      },
      {
        name: 'Certificates',
        title: 'Certificates',
        icon: 'mdi-certificate-outline',
        to: '/certificates',
        match: ['/certificates'],
        permission: 'generate_certificates',
      },
      {
        name: 'Feedback',
        title: 'Feedback',
        icon: 'mdi-message-text-outline',
        to: '/feedback',
        permission: 'view_reports',
      },
    ],
  },
  {
    label: 'Communication',
    items: [
      {
        name: 'Notifications',
        title: 'Notifications',
        icon: 'mdi-bell-outline',
        to: '/notifications',
        permission: 'send_notifications',
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        name: 'Admins',
        title: 'Administrators',
        icon: 'mdi-shield-account-outline',
        to: '/admins',
        permission: 'manage_admins',
      },
      {
        name: 'Settings',
        title: 'Settings',
        icon: 'mdi-cog-outline',
        to: '/settings',
        permission: 'manage_settings',
      },
    ],
  },
]

const visibleGroups = computed(() =>
  groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || auth.can(item.permission)
      ),
    }))
    .filter((group) => group.items.length > 0)
)

const isActive = (item) => {
  if (item.match) {
    return item.match.some(
      (prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`)
    )
  }
  return route.path === item.to
}

const toggleDrawer = () => {
  if (mobile.value) drawer.value = !drawer.value
  else rail.value = !rail.value
}

const goToDashboard = () => {
  router.push('/')
}

const toggleTheme = () => {
  const next = isDark.value ? 'light' : 'dark'
  theme.global.name.value = next
  localStorage.setItem('admin_theme', next)
}

const signOut = async () => {
  await auth.logout()
  router.push('/login')
}

const updateOnline = () => {
  online.value = navigator.onLine
}

onMounted(() => {
  if (mobile.value) drawer.value = false
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
  auth.fetchProfile()
})

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
})
</script>

<style scoped>
.admin-drawer {
  border-right: 1px solid rgba(15, 42, 68, 0.08);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 72px;
  padding: 0 18px;
}

.brand-block--rail {
  justify-content: center;
  padding: 0;
}

.brand-mark {
  width: 38px;
  height: 38px;
  object-fit: contain;
  cursor: pointer;
}

.brand-name {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-primary));
}

.brand-subtitle {
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.drawer-divider {
  opacity: 0.14;
}

.drawer-nav {
  padding: 10px 8px 16px;
}

.nav-section-label {
  padding: 14px 14px 4px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.48);
}

.nav-item {
  border-radius: 4px;
  margin-bottom: 2px;
  font-size: 0.875rem;
}

.nav-item.v-list-item--active {
  background: rgba(15, 42, 68, 0.08);
  font-weight: 600;
}

.v-theme--dark .nav-item.v-list-item--active {
  background: rgba(201, 164, 76, 0.16);
}

.drawer-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
}

.drawer-footer--rail {
  justify-content: center;
  padding: 14px 0;
}

.footer-identity {
  min-width: 0;
  flex-grow: 1;
}

.footer-name {
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.footer-role {
  font-size: 0.68rem;
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.admin-appbar {
  border-bottom: 1px solid rgba(15, 42, 68, 0.08);
  background: rgb(var(--v-theme-surface));
}

.appbar-title {
  margin-left: 4px;
}

.appbar-eyebrow {
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.5);
  line-height: 1.2;
}

.appbar-heading {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.admin-main {
  background: rgb(var(--v-theme-background));
}

.admin-content {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
}

.offline-banner {
  border-radius: 0;
}

@media (max-width: 600px) {
  .admin-content {
    padding: 16px;
  }
}
</style>
