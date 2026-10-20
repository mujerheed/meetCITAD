import { defineStore } from 'pinia'
import api, { getErrorMessage } from '@/api'

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
    upcomingEvents: (state) =>
      state.events.filter((event) => {
        const start = new Date(event.startDate || event.startDateTime)
        return !Number.isNaN(start.getTime()) && start >= new Date()
      }),
    pastEvents: (state) =>
      state.events.filter((event) => {
        const end = new Date(event.endDate || event.startDate || event.date)
        return !Number.isNaN(end.getTime()) && end < new Date()
      }),
    registeredEvents: (state) =>
      state.myEvents.filter(
        (event) =>
          !event.attended &&
          ['confirmed', 'registered', 'pending', 'attended'].includes(
            event.registration?.status
          )
      ),
    attendedEvents: (state) =>
      state.myEvents.filter(
        (event) => event.attended || event.registration?.attended
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

        const { events, pagination } = await api.events.getAll(queryParams)

        this.events = events
        this.pagination = pagination
        return events
      } catch (error) {
        this.error = getErrorMessage(error, 'Failed to load events.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchEventById(id) {
      this.loading = true
      this.error = null

      try {
        const event = await api.events.getById(id)
        this.currentEvent = event
        return event
      } catch (error) {
        this.error = getErrorMessage(error, 'Failed to load the event.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchMyEvents(params = {}) {
      this.loading = true
      this.error = null

      try {
        this.myEvents = await api.events.getMyEvents(params)
        return this.myEvents
      } catch (error) {
        this.error = getErrorMessage(error, 'Failed to load your events.')
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

        if (this.currentEvent?._id === eventId) {
          await this.fetchEventById(eventId)
        }

        return response
      } catch (error) {
        this.error = getErrorMessage(error, 'Failed to register for this event.')
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
        this.myEvents = this.myEvents.filter((event) => event._id !== eventId)

        if (this.currentEvent?._id === eventId) {
          await this.fetchEventById(eventId)
        }

        return response
      } catch (error) {
        this.error = getErrorMessage(error, 'Failed to cancel your registration.')
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
        return response
      } catch (error) {
        this.error = getErrorMessage(error, 'Failed to check in.')
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchEventQR(eventId) {
      this.error = null

      try {
        return await api.events.getQR(eventId)
      } catch (error) {
        this.error = getErrorMessage(error, 'Could not generate the QR code.')
        throw error
      }
    },

    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
      this.pagination.page = 1
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
