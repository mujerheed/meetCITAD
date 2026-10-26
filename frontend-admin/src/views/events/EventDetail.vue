<template>
  <div>
    <PageHeader
      :title="event?.title || 'Event Details'"
      :subtitle="event ? `${formatDateTime(event.startDate)} · ${event.venueName}` : 'Loading event...'"
      icon="mdi-calendar-text-outline"
    >
      <template #actions>
        <v-btn variant="text" to="/events" prepend-icon="mdi-arrow-left">Events</v-btn>
        <v-btn
          v-if="event?.status === 'draft'"
          color="primary"
          variant="flat"
          elevation="0"
          prepend-icon="mdi-send-outline"
          @click="publishEvent"
        >
          Publish
        </v-btn>
        <v-btn
          color="accent"
          variant="flat"
          elevation="0"
          prepend-icon="mdi-pencil-outline"
          :to="`/events/${eventId}/edit`"
        >
          Edit
        </v-btn>
      </template>
    </PageHeader>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-5"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <v-skeleton-loader v-if="loading" type="card, article, table"></v-skeleton-loader>

    <template v-else-if="event">
      <v-card class="admin-card mb-4" elevation="0">
        <div class="event-hero">
          <v-img :src="event.banner" cover class="event-hero-image"></v-img>
          <div class="event-hero-body">
            <div class="d-flex flex-wrap align-center ga-2 mb-2">
              <StatusChip :status="event.status" />
              <v-chip size="small" variant="tonal">{{ event.category || 'Other' }}</v-chip>
              <v-chip v-if="event.visibility !== 'public'" size="small" variant="tonal" color="warning">
                {{ event.visibility }}
              </v-chip>
              <v-chip v-if="event.certificateEnabled" size="small" variant="tonal" color="success">
                Certificates
              </v-chip>
              <v-chip v-if="event.feedbackEnabled" size="small" variant="tonal" color="info">
                Feedback
              </v-chip>
            </div>

            <p class="event-description">{{ event.shortDescription || event.description }}</p>

            <div class="event-meta-grid">
              <div>
                <div class="meta-label">Starts</div>
                <div class="meta-value">{{ formatDateTime(event.startDate) }}</div>
              </div>
              <div>
                <div class="meta-label">Ends</div>
                <div class="meta-value">{{ formatDateTime(event.endDate) }}</div>
              </div>
              <div>
                <div class="meta-label">Venue</div>
                <div class="meta-value">{{ event.venueName }}</div>
              </div>
              <div>
                <div class="meta-label">Hosted by</div>
                <div class="meta-value">{{ event.hostBy || 'CITAD' }}</div>
              </div>
            </div>
          </div>
        </div>
      </v-card>

      <v-row dense class="mb-4">
        <v-col cols="6" md="3">
          <StatCard
            label="Registrations"
            :value="formatNumber(stats.totalRegistrations ?? event.registrationCount)"
            :caption="`${formatNumber(event.capacity)} capacity`"
            icon="mdi-account-multiple-outline"
            color="#0F2A44"
          />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard
            label="Attended"
            :value="formatNumber(stats.totalAttendance ?? event.attendanceCount)"
            :caption="`${stats.attendanceRate ?? 0}% attendance rate`"
            icon="mdi-account-check-outline"
            color="#059669"
          />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard
            label="Certificates"
            :value="formatNumber(stats.certificatesIssued)"
            caption="Issued for this event"
            icon="mdi-certificate-outline"
            color="#C9A44C"
          />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard
            label="Feedback"
            :value="Number(stats.averageRating || 0).toFixed(2)"
            :caption="`${formatNumber(stats.totalFeedbacks)} response(s)`"
            icon="mdi-message-text-outline"
            color="#D97706"
          />
        </v-col>
      </v-row>

      <v-card class="admin-card" elevation="0">
        <v-tabs v-model="tab" color="primary" density="comfortable" show-arrows>
          <v-tab value="overview" prepend-icon="mdi-information-outline">Overview</v-tab>
          <v-tab value="attendees" prepend-icon="mdi-account-check-outline">Attendees</v-tab>
          <v-tab value="certificates" prepend-icon="mdi-certificate-outline">Certificates</v-tab>
          <v-tab value="feedback" prepend-icon="mdi-message-text-outline">Feedback</v-tab>
          <v-tab value="qr" prepend-icon="mdi-qrcode">QR & Communications</v-tab>
        </v-tabs>

        <v-divider></v-divider>

        <v-window v-model="tab">
          <!-- Overview -->
          <v-window-item value="overview">
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" lg="8">
                  <div class="section-title mb-2">About this event</div>
                  <p class="body-copy">{{ event.description }}</p>

                  <div v-if="event.speakers?.length" class="mt-6">
                    <div class="section-title mb-3">Speakers and facilitators</div>
                    <div class="speaker-list">
                      <div
                        v-for="(speaker, index) in event.speakers"
                        :key="index"
                        class="speaker-item"
                      >
                        <v-avatar size="38" color="primary" class="text-on-primary font-weight-bold">
                          {{ initials(speaker.name) }}
                        </v-avatar>
                        <div>
                          <div class="font-weight-medium">{{ speaker.name }}</div>
                          <div class="text-caption text-medium-emphasis">
                            {{ speaker.title || 'Facilitator' }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="event.tags?.length" class="mt-6">
                    <div class="section-title mb-2">Tags</div>
                    <div class="d-flex flex-wrap ga-2">
                      <v-chip v-for="tag in event.tags" :key="tag" size="small" variant="tonal">
                        {{ tag }}
                      </v-chip>
                    </div>
                  </div>
                </v-col>

                <v-col cols="12" lg="4">
                  <div class="side-panel">
                    <div class="section-title mb-3">Registration</div>
                    <div class="info-row">
                      <span>Registered</span>
                      <strong>{{ formatNumber(event.registrationCount) }}</strong>
                    </div>
                    <div class="info-row">
                      <span>Capacity</span>
                      <strong>{{ formatNumber(event.capacity) }}</strong>
                    </div>
                    <div class="info-row">
                      <span>Spaces left</span>
                      <strong>{{ formatNumber(stats.availableSeats ?? Math.max(0, event.capacity - event.registrationCount)) }}</strong>
                    </div>
                    <div class="info-row">
                      <span>Approval</span>
                      <strong>{{ event.requireApproval ? 'Required' : 'Not required' }}</strong>
                    </div>
                    <div class="info-row">
                      <span>Waitlist</span>
                      <strong>{{ event.waitlistEnabled ? 'Enabled' : 'Disabled' }}</strong>
                    </div>

                    <v-divider class="my-4"></v-divider>

                    <div class="section-title mb-3">Registration window</div>
                    <div class="info-row">
                      <span>Opens</span>
                      <strong>{{ formatDate(event.registrationOpens) || 'Immediately' }}</strong>
                    </div>
                    <div class="info-row">
                      <span>Closes</span>
                      <strong>{{ formatDate(event.registrationCloses) || 'No deadline' }}</strong>
                    </div>

                    <v-divider class="my-4"></v-divider>

                    <div class="section-title mb-3">Venue</div>
                    <div class="text-body-2">{{ event.venueName }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ venueLine }}
                    </div>

                    <v-divider class="my-4"></v-divider>

                    <div class="section-title mb-3">Quick actions</div>
                    <div class="d-grid ga-2">
                      <v-btn variant="tonal" color="primary" prepend-icon="mdi-qrcode-scan" to="/scanner">
                        Open scanner
                      </v-btn>
                      <v-btn variant="tonal" color="primary" prepend-icon="mdi-account-check-outline" :to="`/attendance?event=${eventId}`">
                        Attendance report
                      </v-btn>
                      <v-btn
                        variant="tonal"
                        color="primary"
                        prepend-icon="mdi-open-in-new"
                        :href="publicEventUrl"
                        target="_blank"
                        rel="noopener"
                      >
                        View public page
                      </v-btn>
                    </div>
                  </div>
                </v-col>
              </v-row>

              <v-divider class="my-6"></v-divider>

              <div class="d-flex flex-wrap align-center justify-space-between ga-3">
                <div>
                  <div class="section-title mb-1">Danger zone</div>
                  <div class="section-caption">
                    Cancel or remove this event. Events with registrations cannot be deleted.
                  </div>
                </div>
                <div class="d-flex flex-wrap ga-2">
                  <v-btn
                    v-if="!['cancelled', 'completed'].includes(event.status)"
                    variant="outlined"
                    color="warning"
                    prepend-icon="mdi-cancel"
                    @click="cancelDialog.show = true"
                  >
                    Cancel event
                  </v-btn>
                  <v-btn
                    variant="outlined"
                    color="error"
                    prepend-icon="mdi-delete-outline"
                    :disabled="(event.registrationCount || 0) > 0"
                    @click="deleteDialog.show = true"
                  >
                    Delete event
                  </v-btn>
                </div>
              </div>
            </v-card-text>
          </v-window-item>

          <!-- Attendees -->
          <v-window-item value="attendees">
            <v-card-text class="pa-6">
              <AttendanceTable
                ref="attendanceTable"
                :event-id="eventId"
                :event-title="event.title"
                @updated="onAttendanceUpdated"
              />
            </v-card-text>
          </v-window-item>

          <!-- Certificates -->
          <v-window-item value="certificates">
            <v-card-text class="pa-6">
              <v-row dense class="mb-4">
                <v-col cols="6" md="3">
                  <div class="mini-stat">
                    <div class="mini-value">{{ formatNumber(certificateStats.total) }}</div>
                    <div class="mini-label">Total issued</div>
                  </div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="mini-stat">
                    <div class="mini-value text-success">{{ formatNumber(certificateStats.active) }}</div>
                    <div class="mini-label">Active</div>
                  </div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="mini-stat">
                    <div class="mini-value text-error">{{ formatNumber(certificateStats.revoked) }}</div>
                    <div class="mini-label">Revoked</div>
                  </div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="mini-stat">
                    <div class="mini-value">{{ formatNumber(certificateStats.totalDownloads) }}</div>
                    <div class="mini-label">Downloads</div>
                  </div>
                </v-col>
              </v-row>

              <div class="d-flex flex-wrap align-center ga-3 mb-4">
                <v-select
                  v-model="selectedTemplateId"
                  :items="templateOptions"
                  label="Certificate template"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="max-width: 320px"
                ></v-select>

                <v-btn
                  color="accent"
                  variant="flat"
                  elevation="0"
                  prepend-icon="mdi-certificate-outline"
                  :loading="generatingCertificates"
                  @click="bulkCertDialog.show = true"
                >
                  Generate for attendees
                </v-btn>

                <v-btn variant="outlined" color="primary" prepend-icon="mdi-palette-outline" to="/certificates/templates">
                  Manage templates
                </v-btn>

                <v-spacer></v-spacer>
                <v-btn icon="mdi-refresh" variant="text" :loading="certificatesLoading" @click="loadCertificates"></v-btn>
              </div>

              <v-alert
                v-if="!event.certificateEnabled"
                type="warning"
                variant="tonal"
                density="comfortable"
                class="mb-4"
              >
                Certificates are disabled for this event. Enable them in the event settings first.
              </v-alert>

              <v-table v-if="certificatesLoading || eventCertificates.length" class="admin-table" hover>
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Certificate number</th>
                    <th>Issued</th>
                    <th>Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="certificatesLoading">
                    <tr v-for="index in 3" :key="index">
                      <td colspan="5"><v-skeleton-loader type="text" class="pa-0"></v-skeleton-loader></td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr v-for="certificate in eventCertificates" :key="certificate._id">
                      <td>
                        <div class="font-weight-medium">
                          {{ certificate.recipientName || certificate.userId?.fullname }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ certificate.recipientEmail || certificate.userId?.email }}
                        </div>
                      </td>
                      <td class="mono">{{ certificate.certificateNumber }}</td>
                      <td>{{ formatDate(certificate.issuedDate) }}</td>
                      <td><StatusChip :status="certificate.status" /></td>
                      <td class="text-right">
                        <v-btn
                          icon="mdi-download"
                          variant="text"
                          size="small"
                          aria-label="Download certificate"
                          @click="downloadCertificate(certificate)"
                        ></v-btn>
                        <v-btn
                          icon="mdi-refresh"
                          variant="text"
                          size="small"
                          aria-label="Regenerate certificate"
                          @click="regenerateCertificate(certificate)"
                        ></v-btn>
                        <v-btn
                          v-if="certificate.status === 'active'"
                          icon="mdi-shield-off-outline"
                          variant="text"
                          size="small"
                          color="error"
                          aria-label="Revoke certificate"
                          @click="openRevoke(certificate)"
                        ></v-btn>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </v-table>

              <EmptyState
                v-else-if="!certificatesLoading"
                icon="mdi-certificate-outline"
                title="No certificates issued"
                message="Generate certificates for attendees who checked in to this event."
              >
                <template #action>
                  <v-btn
                    color="accent"
                    variant="flat"
                    elevation="0"
                    :disabled="!event.certificateEnabled"
                    @click="bulkCertDialog.show = true"
                  >
                    Generate Certificates
                  </v-btn>
                </template>
              </EmptyState>
            </v-card-text>
          </v-window-item>

          <!-- Feedback -->
          <v-window-item value="feedback">
            <v-card-text class="pa-6">
              <div class="d-flex align-center justify-space-between mb-4">
                <div>
                  <div class="section-title">Participant feedback</div>
                  <div class="section-caption">
                    Responses from attendees who checked in to this event.
                  </div>
                </div>
                <v-btn icon="mdi-refresh" variant="text" :loading="feedbackLoading" @click="loadFeedback"></v-btn>
              </div>

              <v-row dense class="mb-5">
                <v-col cols="6" md="3">
                  <div class="mini-stat">
                    <div class="mini-value">{{ feedbackAnalytics.totalFeedback || 0 }}</div>
                    <div class="mini-label">Responses</div>
                  </div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="mini-stat">
                    <div class="mini-value">{{ Number(feedbackAnalytics.averageRating || 0).toFixed(2) }}</div>
                    <div class="mini-label">Average rating</div>
                  </div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="mini-stat">
                    <div class="mini-value">{{ Number(feedbackAnalytics.npsScore || 0).toFixed(0) }}</div>
                    <div class="mini-label">NPS score</div>
                  </div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="mini-stat">
                    <div class="mini-value">{{ feedbackAnalytics.responseRate || 0 }}%</div>
                    <div class="mini-label">Response rate</div>
                  </div>
                </v-col>
              </v-row>

              <div v-if="feedbackAnalytics.totalFeedback" class="mb-6">
                <div class="section-title mb-2">Rating distribution</div>
                <div v-for="rating in [5, 4, 3, 2, 1]" :key="rating" class="rating-row">
                  <span class="rating-label">{{ rating }} star</span>
                  <div class="bar-track flex-grow-1">
                    <div
                      class="bar-fill bar-fill--accent"
                      :style="{ width: `${ratingPercent(rating)}%` }"
                    ></div>
                  </div>
                  <span class="rating-count">
                    {{ feedbackAnalytics.ratingDistribution?.[rating] || 0 }}
                  </span>
                </div>
              </div>

              <v-table v-if="feedbackLoading || eventFeedback.length" class="admin-table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Rating</th>
                    <th>Comments</th>
                    <th>Submitted</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="feedbackLoading">
                    <tr v-for="index in 3" :key="index">
                      <td colspan="5"><v-skeleton-loader type="text" class="pa-0"></v-skeleton-loader></td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr v-for="item in eventFeedback" :key="item._id">
                      <td style="min-width: 170px">
                        <div class="font-weight-medium">
                          {{ item.userId?.fullname || 'Anonymous participant' }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ item.userId?.email }}
                        </div>
                        <v-chip
                          v-if="item.booleanQuestions?.wouldRecommend"
                          size="x-small"
                          color="success"
                          variant="tonal"
                          class="mt-1"
                        >
                          Recommends
                        </v-chip>
                      </td>
                      <td>
                        <v-rating
                          :model-value="item.ratings?.overall || 0"
                          readonly
                          density="compact"
                          size="small"
                          color="accent"
                        ></v-rating>
                        <div class="text-caption text-medium-emphasis">
                          NPS {{ item.npsScore ?? '—' }}
                        </div>
                      </td>
                      <td style="max-width: 320px">
                        <div v-if="item.comments?.whatYouLiked" class="feedback-snippet">
                          <strong>Liked:</strong> {{ item.comments.whatYouLiked }}
                        </div>
                        <div v-if="item.comments?.whatCanBeImproved" class="feedback-snippet">
                          <strong>Improve:</strong> {{ item.comments.whatCanBeImproved }}
                        </div>
                        <div v-if="item.response?.message" class="feedback-response">
                          <v-icon size="14">mdi-reply-outline</v-icon>
                          {{ item.response.message }}
                        </div>
                        <span
                          v-if="!item.comments?.whatYouLiked && !item.comments?.whatCanBeImproved && !item.response?.message"
                          class="text-medium-emphasis"
                        >
                          No comments
                        </span>
                      </td>
                      <td>{{ formatDate(item.createdAt) }}</td>
                      <td class="text-right">
                        <v-btn
                          icon="mdi-reply-outline"
                          variant="text"
                          size="small"
                          aria-label="Respond to feedback"
                          @click="openFeedbackDialog(item, 'respond')"
                        ></v-btn>
                        <v-btn
                          icon="mdi-flag-outline"
                          variant="text"
                          size="small"
                          :color="item.isFlagged ? 'warning' : undefined"
                          aria-label="Flag feedback"
                          @click="openFeedbackDialog(item, 'flag')"
                        ></v-btn>
                        <v-btn
                          icon="mdi-delete-outline"
                          variant="text"
                          size="small"
                          color="error"
                          aria-label="Delete feedback"
                          @click="openDeleteFeedback(item)"
                        ></v-btn>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </v-table>

              <EmptyState
                v-else-if="!feedbackLoading"
                icon="mdi-message-text-outline"
                title="No feedback yet"
                message="Feedback appears after attendees submit their responses."
              />
            </v-card-text>
          </v-window-item>

          <!-- QR & communications -->
          <v-window-item value="qr">
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" lg="5">
                  <div class="section-title mb-1">Event QR code</div>
                  <div class="section-caption mb-4">
                    This code identifies the event. Attendance is recorded by scanning
                    each participant's personal ticket.
                  </div>

                  <v-card variant="outlined" class="qr-card">
                    <v-card-text class="text-center pa-6">
                      <v-progress-circular
                        v-if="qrLoading"
                        indeterminate
                        color="primary"
                      ></v-progress-circular>
                      <v-img
                        v-else-if="qrCode"
                        :src="qrCode"
                        max-width="260"
                        class="mx-auto"
                        alt="Event QR code"
                      ></v-img>
                      <p v-else class="text-body-2 text-medium-emphasis">
                        QR code could not be generated.
                      </p>
                    </v-card-text>
                  </v-card>

                  <div class="d-flex flex-wrap ga-2 mt-4 no-print">
                    <v-btn
                      variant="outlined"
                      color="primary"
                      prepend-icon="mdi-download"
                      :disabled="!qrCode"
                      @click="downloadQr"
                    >
                      Download
                    </v-btn>
                    <v-btn
                      variant="outlined"
                      color="primary"
                      prepend-icon="mdi-printer-outline"
                      :disabled="!qrCode"
                      @click="printQr"
                    >
                      Print
                    </v-btn>
                    <v-btn
                      variant="text"
                      color="primary"
                      prepend-icon="mdi-content-copy"
                      @click="copyPublicLink"
                    >
                      Copy event link
                    </v-btn>
                  </div>

                  <div class="public-link mt-4">
                    <div class="text-caption text-medium-emphasis mb-1">Public event page</div>
                    <a :href="publicEventUrl" target="_blank" rel="noopener">{{ publicEventUrl }}</a>
                  </div>
                </v-col>

                <v-col cols="12" lg="7">
                  <div class="section-title mb-1">Event communications</div>
                  <div class="section-caption mb-4">
                    Send a message to everyone registered for this event, or remind
                    attendees who have not checked in.
                  </div>

                  <v-text-field
                    v-model="notification.title"
                    label="Notification title"
                    variant="outlined"
                    :rules="[(v) => Boolean(v) || 'Title is required']"
                    class="mb-3"
                  ></v-text-field>

                  <v-textarea
                    v-model="notification.message"
                    label="Message"
                    variant="outlined"
                    rows="3"
                    counter="1000"
                    maxlength="1000"
                    :rules="[(v) => Boolean(v) || 'Message is required']"
                    class="mb-3"
                  ></v-textarea>

                  <v-row dense class="mb-2">
                    <v-col cols="12" sm="6">
                      <v-select
                        v-model="notification.type"
                        :items="notificationTypes"
                        label="Type"
                        variant="outlined"
                      ></v-select>
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-select
                        v-model="notification.channels"
                        :items="channelOptions"
                        label="Channels"
                        variant="outlined"
                        multiple
                        chips
                        closable-chips
                      ></v-select>
                    </v-col>
                  </v-row>

                  <div class="d-flex flex-wrap ga-2">
                    <v-btn
                      color="primary"
                      variant="flat"
                      elevation="0"
                      prepend-icon="mdi-send-outline"
                      :loading="notificationSending"
                      @click="sendEventNotification"
                    >
                      Send to registrants
                    </v-btn>
                    <v-btn
                      variant="outlined"
                      color="primary"
                      prepend-icon="mdi-bell-ring-outline"
                      :loading="reminderSending"
                      @click="sendReminder"
                    >
                      Remind absentees
                    </v-btn>
                  </div>

                  <v-alert type="info" variant="tonal" density="compact" class="mt-4">
                    In-app notifications always work. Email and SMS delivery depend
                    on configured providers.
                  </v-alert>
                </v-col>
              </v-row>
            </v-card-text>
          </v-window-item>
        </v-window>
      </v-card>
    </template>

    <!-- Cancel event -->
    <ConfirmDialog
      v-model="cancelDialog.show"
      title="Cancel this event?"
      confirm-text="Cancel Event"
      color="warning"
      :loading="cancelDialog.loading"
      @confirm="confirmCancel"
    >
      <p class="mb-3">Participants will see this event as cancelled. Add an optional reason.</p>
      <v-textarea
        v-model="cancelDialog.reason"
        label="Cancellation reason"
        variant="outlined"
        rows="2"
        hide-details
      ></v-textarea>
    </ConfirmDialog>

    <!-- Delete event -->
    <ConfirmDialog
      v-model="deleteDialog.show"
      title="Delete this event?"
      confirm-text="Delete"
      color="error"
      :loading="deleteDialog.loading"
      @confirm="confirmDelete"
    >
      This permanently removes the event. Events with registrations cannot be deleted.
    </ConfirmDialog>

    <!-- Bulk certificates -->
    <ConfirmDialog
      v-model="bulkCertDialog.show"
      title="Generate certificates?"
      confirm-text="Generate"
      color="primary"
      :loading="generatingCertificates"
      @confirm="generateCertificates"
    >
      Certificates will be generated for every attendee of
      <strong>{{ event?.title }}</strong> who does not already have one.
      {{ selectedTemplateId ? 'The selected template will be used.' : 'The default template will be used.' }}
    </ConfirmDialog>

    <!-- Revoke certificate -->
    <ConfirmDialog
      v-model="revokeDialog.show"
      title="Revoke certificate?"
      confirm-text="Revoke"
      color="error"
      :loading="revokeDialog.loading"
      @confirm="confirmRevoke"
    >
      <p class="mb-3">
        Certificate <strong>{{ revokeDialog.certificate?.certificateNumber }}</strong>
        will no longer verify as valid.
      </p>
      <v-textarea
        v-model="revokeDialog.reason"
        label="Reason for revocation"
        variant="outlined"
        rows="2"
        hide-details
      ></v-textarea>
    </ConfirmDialog>

    <!-- Feedback response / flag -->
    <v-dialog v-model="feedbackDialog.show" max-width="520" persistent>
      <v-card class="admin-card" elevation="0">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-5 px-6">
          {{ feedbackDialog.mode === 'respond' ? 'Respond to feedback' : 'Flag feedback' }}
        </v-card-title>
        <v-card-text class="px-6">
          <v-textarea
            v-model="feedbackDialog.message"
            :label="feedbackDialog.mode === 'respond' ? 'Response message' : 'Reason for flagging'"
            variant="outlined"
            rows="4"
            hide-details
          ></v-textarea>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="feedbackDialog.show = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="feedbackDialog.loading"
            @click="submitFeedbackAction"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="deleteFeedbackDialog.show"
      title="Delete feedback?"
      confirm-text="Delete"
      color="error"
      :loading="deleteFeedbackDialog.loading"
      @confirm="confirmDeleteFeedback"
    >
      This feedback response will be permanently deleted.
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import StatusChip from '@/components/StatusChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import AttendanceTable from '@/components/AttendanceTable.vue'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { downloadBlob, filenameTimestamp, slug } from '@/utils/download'

const route = useRoute()
const router = useRouter()
const { notifySuccess, notifyError } = useSnackbar()

const eventId = route.params.id
const tab = ref('overview')
const loading = ref(true)
const error = ref(null)
const event = ref(null)
const stats = ref({})
const attendanceTable = ref(null)

const certificateStats = ref({})
const certificatesLoading = ref(false)
const generatingCertificates = ref(false)
const certificatesLoaded = ref(false)
const eventCertificates = ref([])
const templates = ref([])
const selectedTemplateId = ref('')

const feedbackLoading = ref(false)
const feedbackLoaded = ref(false)
const feedbackAnalytics = ref({})
const eventFeedback = ref([])

const qrCode = ref('')
const qrLoading = ref(false)

const notificationSending = ref(false)
const reminderSending = ref(false)

const notification = reactive({
  title: '',
  message: '',
  type: 'event_update',
  channels: ['in-app', 'email'],
})

const notificationTypes = [
  { title: 'Event update', value: 'event_update' },
  { title: 'Event reminder', value: 'event_reminder' },
  { title: 'Announcement', value: 'announcement' },
]

const channelOptions = [
  { title: 'In-app', value: 'in-app' },
  { title: 'Email', value: 'email' },
  { title: 'SMS', value: 'sms' },
]

const cancelDialog = reactive({ show: false, reason: '', loading: false })
const deleteDialog = reactive({ show: false, loading: false })
const bulkCertDialog = reactive({ show: false })
const revokeDialog = reactive({
  show: false,
  certificate: null,
  reason: '',
  loading: false,
})
const feedbackDialog = reactive({
  show: false,
  mode: 'respond',
  item: null,
  message: '',
  loading: false,
})
const deleteFeedbackDialog = reactive({ show: false, item: null, loading: false })

const formatNumber = (value) => Number(value || 0).toLocaleString('en-US')

const initials = (name = '') =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

const venueLine = computed(() => {
  const venue = event.value?.venue
  if (!venue || typeof venue !== 'object') return 'Kano, Nigeria'
  return [venue.address, venue.city, venue.state, venue.country]
    .filter(Boolean)
    .join(', ')
})

const publicEventUrl = computed(() => {
  const base =
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    (import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin)
  return `${String(base).replace(/\/$/, '')}/events/${eventId}`
})

const templateOptions = computed(() => [
  { title: 'Default template', value: '' },
  ...templates.value.map((template) => ({
    title: `${template.name}${template.isActive ? '' : ' (inactive)'}`,
    value: template._id,
  })),
])

const ratingPercent = (rating) => {
  const total = Number(feedbackAnalytics.value.totalFeedback || 0)
  if (!total) return 0
  const count = Number(feedbackAnalytics.value.ratingDistribution?.[rating] || 0)
  if (!count) return 0
  return Math.max(2, Math.round((count / total) * 100))
}

const loadEvent = async () => {
  loading.value = true
  error.value = null

  try {
    const [eventData, statistics] = await Promise.all([
      api.events.get(eventId),
      api.events.statistics(eventId),
    ])
    event.value = eventData
    stats.value = statistics || {}
    notification.title = `${eventData.title}: important update`
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load this event.')
  } finally {
    loading.value = false
  }
}

const refreshStats = async () => {
  try {
    stats.value = await api.events.statistics(eventId)
  } catch {
    // Keep the previous figures if the refresh fails.
  }
}

const publishEvent = async () => {
  try {
    const updated = await api.events.publish(eventId)
    event.value = updated
    notifySuccess('Event published.')
    refreshStats()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not publish the event.'))
  }
}

const confirmCancel = async () => {
  cancelDialog.loading = true
  try {
    const updated = await api.events.cancel(eventId, cancelDialog.reason)
    event.value = updated
    cancelDialog.show = false
    notifySuccess('Event cancelled.')
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not cancel the event.'))
  } finally {
    cancelDialog.loading = false
  }
}

const confirmDelete = async () => {
  deleteDialog.loading = true
  try {
    await api.events.remove(eventId)
    notifySuccess('Event deleted.')
    router.push('/events')
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not delete the event.'))
  } finally {
    deleteDialog.loading = false
  }
}

const onAttendanceUpdated = (summary) => {
  stats.value = { ...stats.value, ...summary }
  refreshStats()
}

const loadCertificateData = async () => {
  certificatesLoading.value = true
  try {
    const [templateList, statsData, list] = await Promise.all([
      api.certificates.templates({ active: 'true' }),
      api.certificates.statistics({ eventId }),
      api.certificates.list({ eventId, limit: 100 }),
    ])
    templates.value = templateList
    certificateStats.value = statsData || {}
    eventCertificates.value = list.certificates || []
    certificatesLoaded.value = true
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not load certificates for this event.'))
  } finally {
    certificatesLoading.value = false
  }
}

const loadCertificates = async () => {
  await loadCertificateData()
}

const generateCertificates = async () => {
  generatingCertificates.value = true
  try {
    const result = await api.certificates.bulkGenerate(eventId, selectedTemplateId.value || undefined)
    notifySuccess(result.message || 'Certificate generation completed.')
    bulkCertDialog.show = false
    await loadCertificateData()
    await refreshStats()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not generate certificates.'))
  } finally {
    generatingCertificates.value = false
  }
}

const downloadCertificate = async (certificate) => {
  try {
    const response = await api.certificates.download(certificate._id)
    downloadBlob(
      response.data,
      `${certificate.certificateNumber || 'certificate'}.pdf`
    )
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not download the certificate.'))
  }
}

const openRevoke = (certificate) => {
  revokeDialog.certificate = certificate
  revokeDialog.reason = ''
  revokeDialog.show = true
}

const confirmRevoke = async () => {
  if (!revokeDialog.certificate) return
  revokeDialog.loading = true
  try {
    await api.certificates.revoke(revokeDialog.certificate._id, revokeDialog.reason)
    notifySuccess('Certificate revoked.')
    revokeDialog.show = false
    await loadCertificateData()
    await refreshStats()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not revoke the certificate.'))
  } finally {
    revokeDialog.loading = false
  }
}

const regenerateCertificate = async (certificate) => {
  try {
    await api.certificates.regenerate(certificate._id)
    notifySuccess('Certificate regenerated.')
    await loadCertificateData()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not regenerate the certificate.'))
  }
}

const loadFeedbackData = async () => {
  feedbackLoading.value = true
  try {
    const [analytics, list] = await Promise.all([
      api.feedback.analytics(eventId),
      api.feedback.list({ eventId, limit: 100 }),
    ])
    feedbackAnalytics.value = analytics || {}
    eventFeedback.value = list.feedback || []
    feedbackLoaded.value = true
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not load event feedback.'))
  } finally {
    feedbackLoading.value = false
  }
}

const loadFeedback = async () => {
  await loadFeedbackData()
}

const openFeedbackDialog = (item, mode) => {
  feedbackDialog.item = item
  feedbackDialog.mode = mode
  feedbackDialog.message = mode === 'respond' ? item.response?.message || '' : item.flagReason || ''
  feedbackDialog.show = true
}

const submitFeedbackAction = async () => {
  if (!feedbackDialog.item) return
  if (!feedbackDialog.message.trim()) {
    notifyError('Enter a message first.')
    return
  }

  feedbackDialog.loading = true
  try {
    const updated =
      feedbackDialog.mode === 'respond'
        ? await api.feedback.respond(feedbackDialog.item._id, feedbackDialog.message.trim())
        : await api.feedback.flag(feedbackDialog.item._id, feedbackDialog.message.trim())

    const index = eventFeedback.value.findIndex((item) => item._id === feedbackDialog.item._id)
    if (index >= 0 && updated) {
      const previous = eventFeedback.value[index]
      eventFeedback.value[index] = {
        ...previous,
        ...updated,
        userId: previous.userId,
        eventId: previous.eventId,
      }
    }
    feedbackDialog.show = false
    notifySuccess(
      feedbackDialog.mode === 'respond' ? 'Response saved.' : 'Feedback flagged.'
    )
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not save the feedback action.'))
  } finally {
    feedbackDialog.loading = false
  }
}

const openDeleteFeedback = (item) => {
  deleteFeedbackDialog.item = item
  deleteFeedbackDialog.show = true
}

const confirmDeleteFeedback = async () => {
  if (!deleteFeedbackDialog.item) return
  deleteFeedbackDialog.loading = true
  try {
    await api.feedback.remove(deleteFeedbackDialog.item._id)
    eventFeedback.value = eventFeedback.value.filter(
      (item) => item._id !== deleteFeedbackDialog.item._id
    )
    deleteFeedbackDialog.show = false
    notifySuccess('Feedback deleted.')
    await loadFeedbackData()
    await refreshStats()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not delete the feedback.'))
  } finally {
    deleteFeedbackDialog.loading = false
  }
}

const loadQr = async () => {
  if (qrCode.value) return
  qrLoading.value = true
  try {
    const data = await api.events.qr(eventId)
    qrCode.value = data.qrCode || ''
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not generate the event QR code.'))
  } finally {
    qrLoading.value = false
  }
}

const downloadQr = () => {
  if (!qrCode.value) return
  const link = document.createElement('a')
  link.href = qrCode.value
  link.download = `event-qr-${slug(event.value?.title || eventId)}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const printQr = () => {
  if (!qrCode.value) return
  const popup = window.open('', '_blank', 'width=720,height=900')
  if (!popup) return

  popup.document.write(`
    <html>
      <head>
        <title>${escapeHtml(event.value?.title || 'Event QR')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; text-align: center; color: #0F2A44; }
          h1 { font-size: 22px; margin-bottom: 6px; }
          p { color: #555; font-size: 13px; margin: 4px 0; }
          img { width: 360px; max-width: 100%; margin: 28px auto; display: block; }
          .note { margin-top: 24px; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(event.value?.title || 'CITAD Event')}</h1>
        <p>${escapeHtml(formatDateTime(event.value?.startDate))}</p>
        <p>${escapeHtml(event.value?.venueName || '')}</p>
        <img src="${qrCode.value}" alt="Event QR code" />
        <p class="note">meetCITAD · Centre for Information Technology and Development</p>
      </body>
    </html>
  `)
  popup.document.close()
  popup.focus()
  popup.print()
}

const copyPublicLink = async () => {
  try {
    await navigator.clipboard.writeText(publicEventUrl.value)
    notifySuccess('Event link copied.')
  } catch {
    notifyError('Could not copy the link.')
  }
}

const sendEventNotification = async () => {
  if (!notification.title.trim() || !notification.message.trim()) {
    notifyError('Add a title and message.')
    return
  }

  notificationSending.value = true
  try {
    const result = await api.notifications.sendEvent(eventId, {
      title: notification.title.trim(),
      message: notification.message.trim(),
      type: notification.type,
      channels: notification.channels,
    })
    notifySuccess(result.message || 'Event notification sent.')
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not send the notification.'))
  } finally {
    notificationSending.value = false
  }
}

const sendReminder = async () => {
  reminderSending.value = true
  try {
    const result = await api.notifications.sendReminder(eventId)
    notifySuccess(result.message || 'Reminders sent.')
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not send reminders.'))
  } finally {
    reminderSending.value = false
  }
}

watch(tab, (value) => {
  if (value === 'certificates' && !certificatesLoaded.value) loadCertificateData()
  if (value === 'feedback' && !feedbackLoaded.value) loadFeedbackData()
  if (value === 'qr' && !qrCode.value) loadQr()
})

onMounted(loadEvent)
</script>

<style scoped>
.event-hero {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
}

.event-hero-image {
  min-height: 220px;
  height: 100%;
}

.event-hero-body {
  padding: 24px;
}

.event-description {
  font-size: 0.88rem;
  line-height: 1.7;
  color: rgba(var(--v-theme-on-surface), 0.7);
  max-width: 860px;
  margin-bottom: 18px;
}

.event-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.meta-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--admin-muted);
  margin-bottom: 2px;
}

.meta-value {
  font-size: 0.82rem;
  font-weight: 500;
}

.body-copy {
  font-size: 0.88rem;
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.72);
  white-space: pre-line;
}

.side-panel {
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  padding: 18px;
  background: rgba(var(--v-theme-surface), 0.6);
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.8rem;
  padding: 4px 0;
  color: rgba(var(--v-theme-on-surface), 0.74);
}

.info-row strong {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}

.speaker-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.speaker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  padding: 10px 12px;
}

.mini-stat {
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  padding: 12px 14px;
}

.mini-value {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
}

.mini-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--admin-muted);
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.rating-label {
  width: 48px;
  font-size: 0.74rem;
  color: var(--admin-muted);
}

.rating-count {
  width: 28px;
  text-align: right;
  font-size: 0.74rem;
  font-weight: 600;
}

.feedback-snippet {
  font-size: 0.76rem;
  line-height: 1.5;
  margin-bottom: 3px;
}

.feedback-response {
  font-size: 0.74rem;
  color: rgb(var(--v-theme-primary));
  background: rgba(15, 42, 68, 0.05);
  padding: 4px 8px;
  border-radius: 3px;
  margin-top: 4px;
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.v-theme--dark .feedback-response {
  color: #e9d7a7;
  background: rgba(201, 164, 76, 0.1);
}

.qr-card {
  border: 1px dashed var(--admin-border);
}

.public-link {
  border: 1px solid var(--admin-border);
  padding: 10px 12px;
  border-radius: 4px;
  word-break: break-all;
}

.public-link a {
  font-size: 0.78rem;
  color: rgb(var(--v-theme-primary));
}

.v-theme--dark .public-link a {
  color: #e5e7eb;
}

@media (max-width: 960px) {
  .event-hero {
    grid-template-columns: 1fr;
  }

  .event-hero-image {
    min-height: 200px;
  }

  .event-meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
