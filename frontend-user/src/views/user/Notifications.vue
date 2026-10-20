<template>
  <div class="notifications-page">
    <v-container class="py-8">
      <v-row class="mb-6">
        <v-col cols="12" md="8">
          <h1 class="text-h4 font-weight-bold mb-2">Notifications</h1>
          <p class="text-body-1 text-medium-emphasis">
            Updates about your registrations, reminders, certificates and CITAD
            announcements.
          </p>
        </v-col>
        <v-col cols="12" md="4" class="d-flex align-center justify-md-end ga-2">
          <v-chip v-if="unreadCount > 0" color="primary" variant="tonal" size="small">
            {{ unreadCount }} unread
          </v-chip>
          <v-btn
            variant="outlined"
            color="primary"
            size="small"
            :disabled="unreadCount === 0"
            :loading="markingAll"
            @click="markAllAsRead"
          >
            Mark All as Read
          </v-btn>
        </v-col>
      </v-row>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-6"
        closable
        @click:close="notificationStore.clearError()"
      >
        {{ error }}
        <template #append>
          <v-btn variant="text" size="small" @click="loadNotifications">Retry</v-btn>
        </template>
      </v-alert>

      <!-- Filters -->
      <v-chip-group
        :model-value="filter"
        mandatory
        selected-class="text-primary"
        class="mb-4"
        @update:model-value="changeFilter"
      >
        <v-chip value="all" filter variant="outlined">
          All
        </v-chip>
        <v-chip value="unread" filter variant="outlined">
          Unread
          <span v-if="unreadCount > 0" class="ml-1">({{ unreadCount }})</span>
        </v-chip>
      </v-chip-group>

      <v-divider class="mb-6"></v-divider>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
        <p class="text-body-2 text-medium-emphasis mt-4">Loading notifications...</p>
      </div>

      <!-- Notifications List -->
      <v-card v-else-if="filteredNotifications.length > 0" elevation="1">
        <template
          v-for="(notification, index) in filteredNotifications"
          :key="notification._id"
        >
          <div
            class="notification-row"
            :class="{ 'notification-row--unread': !notification.read }"
            role="button"
            tabindex="0"
            @click="openNotification(notification)"
            @keydown.enter="openNotification(notification)"
          >
            <div class="notification-icon" :class="`icon--${iconFor(notification).color}`">
              <v-icon color="white" size="20">{{ iconFor(notification).icon }}</v-icon>
            </div>

            <div class="notification-body">
              <div class="d-flex align-center ga-2 mb-1">
                <span class="text-body-1 font-weight-medium">
                  {{ notification.title }}
                </span>
                <span
                  v-if="!notification.read"
                  class="unread-dot"
                  aria-label="Unread"
                ></span>
              </div>
              <p class="text-body-2 text-medium-emphasis mb-2">
                {{ notification.message }}
              </p>
              <div class="text-caption text-medium-emphasis">
                {{ timeAgo(notification.createdAt) }}
              </div>
            </div>

            <v-btn
              icon
              variant="text"
              size="small"
              aria-label="Delete notification"
              @click.stop="remove(notification)"
            >
              <v-icon size="18">mdi-close</v-icon>
            </v-btn>
          </div>

          <v-divider v-if="index < filteredNotifications.length - 1"></v-divider>
        </template>
      </v-card>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <v-icon size="80" color="grey-lighten-1" class="mb-4">
          mdi-bell-outline
        </v-icon>
        <h3 class="text-h6 text-medium-emphasis mb-2">
          {{ filter === 'unread' ? 'No unread notifications' : 'No notifications yet' }}
        </h3>
        <p class="text-body-2 text-medium-emphasis">
          {{
            filter === 'unread'
              ? 'You are all caught up.'
              : 'Register for an event and updates will appear here.'
          }}
        </p>
      </div>

      <!-- Load More -->
      <div v-if="hasMore && filteredNotifications.length > 0" class="text-center mt-6">
        <v-btn
          variant="outlined"
          color="primary"
          :loading="loadingMore"
          @click="notificationStore.loadMore()"
        >
          Load More
        </v-btn>
      </div>
    </v-container>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import { timeAgo } from '@/utils/formatters'

const router = useRouter()
const notificationStore = useNotificationStore()

const {
  filteredNotifications,
  unreadCount,
  loading,
  loadingMore,
  error,
  hasMore,
  filter,
} = storeToRefs(notificationStore)

const markingAll = ref(false)
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success',
})

const iconMap = {
  registration_confirmation: { icon: 'mdi-calendar-check', color: 'primary' },
  event_registration: { icon: 'mdi-calendar-check', color: 'primary' },
  event_reminder: { icon: 'mdi-clock-alert-outline', color: 'warning' },
  event_update: { icon: 'mdi-calendar-edit', color: 'primary' },
  certificate_ready: { icon: 'mdi-certificate-outline', color: 'success' },
  certificate: { icon: 'mdi-certificate-outline', color: 'success' },
  feedback_request: { icon: 'mdi-message-text-outline', color: 'secondary' },
  feedback: { icon: 'mdi-message-text-outline', color: 'secondary' },
  announcement: { icon: 'mdi-bullhorn-outline', color: 'primary' },
  promotional: { icon: 'mdi-tag-outline', color: 'secondary' },
  system: { icon: 'mdi-information-outline', color: 'secondary' },
}

const iconFor = (notification) =>
  iconMap[notification.type] || iconMap.system

const showSnackbar = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

const loadNotifications = async () => {
  try {
    await notificationStore.fetchNotifications()
  } catch {
    // Error is surfaced through the store.
  }
}

const changeFilter = (value) => {
  if (value) notificationStore.setFilter(value)
}

const openNotification = async (notification) => {
  await notificationStore.markAsRead(notification)

  if (notification.link) {
    router.push(notification.link)
  }
}

const markAllAsRead = async () => {
  markingAll.value = true
  try {
    await notificationStore.markAllAsRead()
    showSnackbar('All notifications marked as read.')
  } catch (err) {
    showSnackbar(
      err.response?.data?.message || 'Could not mark notifications as read.',
      'error'
    )
  } finally {
    markingAll.value = false
  }
}

const remove = async (notification) => {
  await notificationStore.removeNotification(notification)
  if (notificationStore.error) {
    showSnackbar(notificationStore.error, 'error')
  }
}

onMounted(loadNotifications)
</script>

<style scoped>
.notifications-page {
  min-height: calc(100vh - 64px - 300px);
}

.notification-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.notification-row:hover {
  background-color: rgba(15, 42, 68, 0.03);
}

.notification-row--unread {
  background-color: rgba(15, 42, 68, 0.035);
}

.notification-icon {
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon--primary {
  background-color: #0f2a44;
}

.icon--secondary {
  background-color: #374151;
}

.icon--success {
  background-color: #059669;
}

.icon--warning {
  background-color: #d97706;
}

.notification-body {
  flex: 1 1 auto;
  min-width: 0;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #0f2a44;
  display: inline-block;
}

.v-theme--dark .notification-row--unread,
.v-theme--dark .notification-row:hover {
  background-color: rgba(255, 255, 255, 0.04);
}

.v-theme--dark .unread-dot {
  background-color: #c9a44c;
}
</style>
