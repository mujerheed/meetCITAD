import { defineStore } from 'pinia'
import api, { getErrorMessage } from '@/api'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    loadingMore: false,
    error: null,
    filter: 'all',
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 1,
    },
  }),

  getters: {
    unreadNotifications: (state) =>
      state.notifications.filter((notification) => !notification.read),
    hasMore: (state) => state.pagination.page < state.pagination.pages,
    filteredNotifications: (state) =>
      state.filter === 'unread'
        ? state.notifications.filter((notification) => !notification.read)
        : state.notifications,
  },

  actions: {
    async fetchNotifications({ page = 1, append = false } = {}) {
      if (append) {
        this.loadingMore = true
      } else {
        this.loading = true
      }
      this.error = null

      try {
        const result = await api.notifications.getAll({
          page,
          limit: this.pagination.limit,
        })

        this.notifications = append
          ? [...this.notifications, ...result.notifications]
          : result.notifications
        this.pagination = {
          page: result.pagination.page || page,
          limit: result.pagination.limit || this.pagination.limit,
          total: result.pagination.total ?? result.notifications.length,
          pages: result.pagination.pages || result.pagination.totalPages || 1,
        }
        this.unreadCount =
          result.unreadCount ??
          this.notifications.filter((notification) => !notification.read).length

        return this.notifications
      } catch (error) {
        this.error = getErrorMessage(error, 'Failed to load notifications.')
        throw error
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },

    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      await this.fetchNotifications({
        page: this.pagination.page + 1,
        append: true,
      })
    },

    async fetchUnreadCount() {
      try {
        this.unreadCount = await api.notifications.getUnreadCount()
      } catch {
        // Non-critical: the badge simply stays hidden.
      }
    },

    async markAsRead(notification) {
      if (!notification || notification.read) return

      // Optimistic update.
      notification.read = true
      this.unreadCount = Math.max(0, this.unreadCount - 1)

      try {
        await api.notifications.markAsRead(notification._id)
      } catch (error) {
        notification.read = false
        this.unreadCount += 1
        this.error = getErrorMessage(error, 'Could not mark the notification as read.')
      }
    },

    async markAllAsRead() {
      try {
        await api.notifications.markAllAsRead()
        this.notifications.forEach((notification) => {
          notification.read = true
        })
        this.unreadCount = 0
      } catch (error) {
        this.error = getErrorMessage(error, 'Could not mark all notifications as read.')
        throw error
      }
    },

    async removeNotification(notification) {
      const index = this.notifications.findIndex(
        (item) => item._id === notification._id
      )
      if (index === -1) return

      const [removed] = this.notifications.splice(index, 1)
      if (!removed.read) this.unreadCount = Math.max(0, this.unreadCount - 1)

      try {
        await api.notifications.remove(notification._id)
      } catch (error) {
        this.notifications.splice(index, 0, removed)
        if (!removed.read) this.unreadCount += 1
        this.error = getErrorMessage(error, 'Could not delete the notification.')
      }
    },

    setFilter(filter) {
      this.filter = filter
    },

    clearError() {
      this.error = null
    },
  },
})
