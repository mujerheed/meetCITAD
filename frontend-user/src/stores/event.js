import { defineStore } from 'pinia'
import api from '@/api'

export const useEventStore = defineStore('event', {
  state: () => ({
    events: [],
    currentEvent: null,
    myEvents: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 0,
    },
    filters: {
      search: '',
      category: '',
      status: '',
      sortBy: 'startDate',
      sortOrder: 'asc',
    },
  }),

  getters: {
    upcomingEvents: (state) => state.events.filter(
      event => new Date(event.startDate) > new Date()
    ),
    pastEvents: (state) => state.events.filter(
      event => new Date(event.endDate) < new Date()
    ),
    registeredEvents: (state) => state.myEvents.filter(
      event => event.registrationStatus === 'registered'
    ),
  },

  actions: {
    async fetchEvents(params = {}) {
      this.loading = true
      this.error = null
      try {
        const queryParams = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...this.filters,
          ...params,
        }
        
        const response = await api.events.getAll(queryParams)
        this.events = response.data.events
        this.pagination = {
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages,
        }
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch events'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchEventById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await api.events.getById(id)
        this.currentEvent = response.data.event
        return response.data.event
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch event'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchMyEvents() {
      this.loading = true
      this.error = null
      try {
        const response = await api.events.getMyEvents()
        this.myEvents = response.data.events
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to fetch your events'
        throw error
      } finally {
        this.loading = false
      }
    },

    async registerForEvent(eventId) {
      this.loading = true
      this.error = null
      try {
        const response = await api.events.register(eventId)
        // Update the event in the list
        const eventIndex = this.events.findIndex(e => e._id === eventId)
        if (eventIndex !== -1) {
          this.events[eventIndex] = response.data.event
        }
        // Update current event if it's the same
        if (this.currentEvent?._id === eventId) {
          this.currentEvent = response.data.event
        }
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to register for event'
        throw error
      } finally {
        this.loading = false
      }
    },

    async unregisterFromEvent(eventId) {
      this.loading = true
      this.error = null
      try {
        const response = await api.events.unregister(eventId)
        // Update the event in the list
        const eventIndex = this.events.findIndex(e => e._id === eventId)
        if (eventIndex !== -1) {
          this.events[eventIndex] = response.data.event
        }
        // Update current event if it's the same
        if (this.currentEvent?._id === eventId) {
          this.currentEvent = response.data.event
        }
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to unregister from event'
        throw error
      } finally {
        this.loading = false
      }
    },

    async checkInToEvent(eventId, code) {
      this.loading = true
      this.error = null
      try {
        const response = await api.events.checkIn(eventId, code)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to check in'
        throw error
      } finally {
        this.loading = false
      }
    },

    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
      this.pagination.page = 1 // Reset to first page when filters change
    },

    setPage(page) {
      this.pagination.page = page
    },

    clearError() {
      this.error = null
    },

    clearCurrentEvent() {
      this.currentEvent = null
    },
  },
})
