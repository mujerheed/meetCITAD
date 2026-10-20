<template>
  <div>
    <PageHeader
      :title="user?.fullname || 'User Details'"
      :subtitle="user?.email || 'Loading participant record...'"
      icon="mdi-account-outline"
    >
      <template #actions>
        <v-btn variant="text" to="/users" prepend-icon="mdi-arrow-left">Users</v-btn>
        <v-btn
          v-if="user"
          :color="user.status === 'active' ? 'warning' : 'success'"
          variant="outlined"
          :prepend-icon="user.status === 'active' ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'"
          @click="openStatus(user.status === 'active' ? 'suspended' : 'active')"
        >
          {{ user.status === 'active' ? 'Suspend' : 'Activate' }}
        </v-btn>
        <v-btn
          v-if="user"
          color="error"
          variant="outlined"
          prepend-icon="mdi-delete-outline"
          @click="deleteDialog.show = true"
        >
          Delete
        </v-btn>
      </template>
    </PageHeader>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <v-skeleton-loader v-if="loading" type="card, article, table"></v-skeleton-loader>

    <template v-else-if="user">
      <v-card class="admin-card mb-4" elevation="0">
        <v-card-text class="pa-6">
          <div class="profile-hero">
            <v-avatar size="76" color="primary" class="text-white font-weight-bold">
              <v-img v-if="user.profileImage" :src="resolveMediaUrl(user.profileImage)" cover></v-img>
              <template v-else>{{ initials(user.fullname) }}</template>
            </v-avatar>

            <div class="profile-main">
              <div class="d-flex flex-wrap align-center ga-2 mb-1">
                <h2 class="profile-name">{{ user.fullname }}</h2>
                <StatusChip :status="user.status" />
                <v-chip
                  :color="user.emailVerified ? 'success' : 'warning'"
                  variant="tonal"
                  size="small"
                  :prepend-icon="user.emailVerified ? 'mdi-check-decagram' : 'mdi-email-alert-outline'"
                >
                  {{ user.emailVerified ? 'Email verified' : 'Email unverified' }}
                </v-chip>
              </div>

              <div class="profile-contact">
                <span><v-icon size="15">mdi-email-outline</v-icon>{{ user.email }}</span>
                <span><v-icon size="15">mdi-phone-outline</v-icon>{{ user.phone || 'No phone' }}</span>
                <span><v-icon size="15">mdi-map-marker-outline</v-icon>{{ location || 'Location not provided' }}</span>
              </div>

              <div class="text-caption text-medium-emphasis mt-2">
                Joined {{ formatDate(user.createdAt) }} · Last active {{ timeAgo(user.lastActivity || user.lastLogin) || 'unknown' }}
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-row dense class="mb-4">
        <v-col cols="6" md="3">
          <StatCard
            label="Events registered"
            :value="formatNumber(user.stats?.totalEventsRegistered)"
            caption="Across all CITAD events"
            icon="mdi-calendar-check-outline"
            color="#0F2A44"
          />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard
            label="Events attended"
            :value="formatNumber(user.stats?.totalEventsAttended)"
            caption="Checked-in attendance"
            icon="mdi-account-check-outline"
            color="#059669"
          />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard
            label="Attendance rate"
            :value="`${attendanceRate}%`"
            caption="Attended vs registered"
            icon="mdi-chart-donut"
            color="#C9A44C"
          />
        </v-col>
        <v-col cols="6" md="3">
          <StatCard
            label="Certificates"
            :value="formatNumber(user.stats?.totalCertificates ?? certificates.length)"
            caption="Issued to this participant"
            icon="mdi-certificate-outline"
            color="#D97706"
          />
        </v-col>
      </v-row>

      <v-row dense>
        <v-col cols="12" lg="8">
          <v-card class="admin-card mb-4" elevation="0">
            <v-card-text class="pa-6">
              <div class="section-title mb-4">Registered events</div>

              <v-table v-if="registeredEvents.length" class="admin-table" hover>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Registration</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="registration in registeredEvents"
                    :key="registration.eventId?._id || registration._id"
                    class="clickable-row"
                    @click="registration.eventId?._id && $router.push(`/events/${registration.eventId._id}`)"
                  >
                    <td class="font-weight-medium">
                      {{ registration.eventId?.title || 'Removed event' }}
                    </td>
                    <td>{{ formatDate(registration.eventId?.startDateTime) }}</td>
                    <td>
                      <v-chip size="small" variant="tonal" :color="registration.status === 'confirmed' ? 'success' : 'warning'">
                        {{ registration.status }}
                      </v-chip>
                    </td>
                    <td>
                      <StatusChip :status="registration.attended ? 'attended' : 'absent'" />
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <EmptyState
                v-else
                icon="mdi-calendar-blank-outline"
                title="No event registrations"
                message="This participant has not registered for an event yet."
              />
            </v-card-text>
          </v-card>

          <v-card class="admin-card" elevation="0">
            <v-card-text class="pa-6">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="section-title">Certificates</div>
                <v-chip size="small" variant="tonal">{{ certificates.length }} issued</v-chip>
              </div>

              <v-table v-if="certificates.length" class="admin-table">
                <thead>
                  <tr>
                    <th>Certificate</th>
                    <th>Event</th>
                    <th>Issued</th>
                    <th>Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="certificate in certificates" :key="certificate._id">
                    <td class="mono">{{ certificate.certificateNumber }}</td>
                    <td>{{ certificate.eventId?.title || '—' }}</td>
                    <td>{{ formatDate(certificate.issuedDate) }}</td>
                    <td><StatusChip :status="certificate.status" /></td>
                    <td class="text-right">
                      <v-btn
                        icon="mdi-download"
                        size="small"
                        variant="text"
                        aria-label="Download certificate"
                        :disabled="certificate.status === 'revoked'"
                        @click="downloadCertificate(certificate)"
                      ></v-btn>
                      <v-btn
                        icon="mdi-open-in-new"
                        size="small"
                        variant="text"
                        aria-label="Verify certificate"
                        :href="`${publicSiteUrl}/verify/${certificate.verificationHash}`"
                        target="_blank"
                        rel="noopener"
                      ></v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <EmptyState
                v-else
                icon="mdi-certificate-outline"
                title="No certificates"
                message="Certificates issued to this participant will appear here."
              />
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card class="admin-card mb-4" elevation="0">
            <v-card-text class="pa-6">
              <div class="section-title mb-3">Profile</div>

              <div class="detail-row">
                <span>Participant type</span>
                <strong>{{ user.participantType || '—' }}</strong>
              </div>
              <div class="detail-row">
                <span>Job title</span>
                <strong>{{ user.jobTitle || '—' }}</strong>
              </div>
              <div class="detail-row">
                <span>Organisation</span>
                <strong>{{ user.organisation || '—' }}</strong>
              </div>
              <div class="detail-row">
                <span>Gender</span>
                <strong class="text-capitalize">{{ (user.gender || '—').replaceAll('_', ' ') }}</strong>
              </div>
              <div class="detail-row">
                <span>Date of birth</span>
                <strong>{{ formatDate(user.dateOfBirth) || '—' }}</strong>
              </div>
              <div class="detail-row">
                <span>Registration source</span>
                <strong class="text-capitalize">{{ user.registrationSource || 'web' }}</strong>
              </div>

              <template v-if="user.biography">
                <v-divider class="my-3"></v-divider>
                <div class="text-caption text-medium-emphasis mb-1">Biography</div>
                <p class="text-body-2 mb-0">{{ user.biography }}</p>
              </template>
            </v-card-text>
          </v-card>

          <v-card class="admin-card mb-4" elevation="0">
            <v-card-text class="pa-6">
              <div class="section-title mb-1">Communication preferences</div>
              <div class="section-caption mb-4">How this participant receives notices.</div>

              <div class="preference-row">
                <span>Email notifications</span>
                <v-chip size="x-small" :color="user.preferences?.emailNotifications ? 'success' : 'grey'" variant="tonal">
                  {{ user.preferences?.emailNotifications ? 'On' : 'Off' }}
                </v-chip>
              </div>
              <div class="preference-row">
                <span>SMS notifications</span>
                <v-chip size="x-small" :color="user.preferences?.smsNotifications ? 'success' : 'grey'" variant="tonal">
                  {{ user.preferences?.smsNotifications ? 'On' : 'Off' }}
                </v-chip>
              </div>
              <div class="preference-row">
                <span>Push notifications</span>
                <v-chip size="x-small" :color="user.preferences?.pushNotifications ? 'success' : 'grey'" variant="tonal">
                  {{ user.preferences?.pushNotifications ? 'On' : 'Off' }}
                </v-chip>
              </div>
              <div class="preference-row">
                <span>Marketing emails</span>
                <v-chip size="x-small" :color="user.preferences?.marketingEmails ? 'success' : 'grey'" variant="tonal">
                  {{ user.preferences?.marketingEmails ? 'On' : 'Off' }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="admin-card" elevation="0">
            <v-card-text class="pa-6">
              <div class="section-title mb-1">Account security</div>
              <div class="section-caption mb-4">Sign-in and verification state.</div>

              <div class="detail-row">
                <span>Account status</span>
                <StatusChip :status="user.status" />
              </div>
              <div class="detail-row">
                <span>Email verified</span>
                <strong>{{ user.emailVerified ? 'Yes' : 'No' }}</strong>
              </div>
              <div class="detail-row">
                <span>Two-factor auth</span>
                <strong>{{ user.twoFactorEnabled ? 'Enabled' : 'Disabled' }}</strong>
              </div>
              <div class="detail-row">
                <span>Last login</span>
                <strong>{{ formatDate(user.lastLogin) || 'Never' }}</strong>
              </div>
              <div class="detail-row">
                <span>Failed attempts</span>
                <strong>{{ user.loginAttempts || 0 }}</strong>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <ConfirmDialog
      v-model="statusDialog.show"
      :title="statusDialog.status === 'active' ? 'Activate this account?' : 'Suspend this account?'"
      :confirm-text="statusDialog.status === 'active' ? 'Activate' : 'Suspend'"
      :color="statusDialog.status === 'active' ? 'success' : 'warning'"
      :loading="statusDialog.loading"
      @confirm="confirmStatus"
    >
      {{ statusDialog.status === 'active'
        ? 'The participant will be able to sign in and register for events again.'
        : 'The participant will be unable to sign in or register until the account is reactivated.' }}
    </ConfirmDialog>

    <ConfirmDialog
      v-model="deleteDialog.show"
      title="Delete this account?"
      confirm-text="Delete"
      color="error"
      :loading="deleteDialog.loading"
      @confirm="confirmDelete"
    >
      This performs a soft delete. The participant is signed out and cannot
      access the platform, while historical event records remain available.
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import StatusChip from '@/components/StatusChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDate, timeAgo } from '@/utils/formatters'
import { resolveMediaUrl } from '@/utils/normalizers'
import { downloadBlob } from '@/utils/download'

const route = useRoute()
const router = useRouter()
const { notifySuccess, notifyError } = useSnackbar()

const userId = route.params.id
const loading = ref(true)
const error = ref(null)
const user = ref(null)
const certificates = ref([])

const statusDialog = reactive({ show: false, status: 'suspended', loading: false })
const deleteDialog = reactive({ show: false, loading: false })

const formatNumber = (value) => Number(value || 0).toLocaleString('en-US')

const publicSiteUrl = computed(
  () =>
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    (import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin)
)

const initials = (name = '') =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

const location = computed(() => {
  const address = user.value?.address || {}
  return [address.city, address.state, address.country].filter(Boolean).join(', ')
})

const attendanceRate = computed(() => {
  const registered = Number(user.value?.stats?.totalEventsRegistered || 0)
  const attended = Number(user.value?.stats?.totalEventsAttended || 0)
  if (!registered) return '0.00'
  return ((attended / registered) * 100).toFixed(2)
})

const registeredEvents = computed(() =>
  (user.value?.registeredEvents || [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.eventId?.startDateTime || b.registeredAt || 0) -
        new Date(a.eventId?.startDateTime || a.registeredAt || 0)
    )
)

const load = async () => {
  loading.value = true
  error.value = null

  try {
    const [userData, certificateData] = await Promise.all([
      api.admin.user(userId),
      api.certificates.userCertificates(userId).catch(() => []),
    ])
    user.value = userData
    certificates.value = certificateData || []
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load this participant.')
  } finally {
    loading.value = false
  }
}

const openStatus = (status) => {
  statusDialog.status = status
  statusDialog.show = true
}

const confirmStatus = async () => {
  statusDialog.loading = true
  try {
    const updated = await api.admin.updateUserStatus(userId, statusDialog.status)
    if (updated) user.value = { ...user.value, ...updated }
    statusDialog.show = false
    notifySuccess(`Account ${statusDialog.status === 'active' ? 'activated' : 'suspended'}.`)
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not update the account status.'))
  } finally {
    statusDialog.loading = false
  }
}

const confirmDelete = async () => {
  deleteDialog.loading = true
  try {
    await api.admin.deleteUser(userId)
    notifySuccess('User account deleted.')
    router.push('/users')
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not delete the account.'))
  } finally {
    deleteDialog.loading = false
  }
}

const downloadCertificate = async (certificate) => {
  try {
    const response = await api.certificates.download(certificate._id)
    downloadBlob(response.data, `${certificate.certificateNumber || 'certificate'}.pdf`)
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not download the certificate.'))
  }
}

onMounted(load)
</script>

<style scoped>
.profile-hero {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.profile-main {
  min-width: 0;
}

.profile-name {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-primary));
}

.v-theme--dark .profile-name {
  color: #f9fafb;
}

.profile-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 0.8rem;
  color: var(--admin-muted);
  margin-top: 6px;
}

.profile-contact span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.detail-row,
.preference-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 7px 0;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--admin-border);
}

.detail-row:last-child,
.preference-row:last-child {
  border-bottom: 0;
}

.detail-row span,
.preference-row span {
  color: var(--admin-muted);
}

.detail-row strong {
  text-align: right;
  font-weight: 600;
}

@media (max-width: 600px) {
  .profile-hero {
    flex-direction: column;
  }
}
</style>
