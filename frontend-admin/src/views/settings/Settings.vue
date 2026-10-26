<template>
  <div>
    <PageHeader
      title="Settings"
      subtitle="Manage your administrator profile, security, audit history, exports, and system status."
      icon="mdi-cog-outline"
    >
      <template #actions>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-refresh" :loading="healthLoading" @click="loadHealth">
          Check System
        </v-btn>
      </template>
    </PageHeader>

    <v-tabs v-model="tab" color="primary" class="admin-tabs mb-4" show-arrows>
      <v-tab value="profile" prepend-icon="mdi-account-outline">Profile</v-tab>
      <v-tab value="security" prepend-icon="mdi-shield-lock-outline">Security</v-tab>
      <v-tab value="audit" prepend-icon="mdi-history">Audit Log</v-tab>
      <v-tab value="system" prepend-icon="mdi-server-outline">System</v-tab>
      <v-tab value="export" prepend-icon="mdi-download-outline">Data Export</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- ------------------------------------------------------------ Profile -->
      <v-window-item value="profile">
        <v-row dense>
          <v-col cols="12" lg="8">
            <v-card class="admin-card" elevation="0">
              <v-card-text class="pa-6">
                <div class="section-title mb-1">Administrator profile</div>
                <div class="section-caption mb-5">
                  Your name and department appear in the portal and on audit records.
                </div>

                <div class="profile-row mb-5">
                  <v-avatar size="72" color="primary" class="text-on-primary font-weight-bold">
                    <v-img v-if="profileForm.profileImage" :src="profileForm.profileImage" cover></v-img>
                    <template v-else>{{ auth.initials || 'A' }}</template>
                  </v-avatar>
                  <div>
                    <div class="font-weight-bold">{{ auth.displayName }}</div>
                    <div class="text-caption text-medium-emphasis">{{ auth.roleLabel }}</div>
                    <v-chip
                      size="x-small"
                      color="success"
                      variant="tonal"
                      class="mt-1"
                    >
                      {{ auth.currentAdmin?.status || 'Active' }}
                    </v-chip>
                  </div>
                </div>

                <v-row dense>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.fullname"
                      label="Full name"
                      variant="outlined"
                      :rules="[required('Full name')]"
                      class="mb-2"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.email"
                      label="CITAD email"
                      variant="outlined"
                      readonly
                      hint="Administrator emails cannot be changed from the portal."
                      persistent-hint
                      class="mb-2"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.phone"
                      label="Phone number"
                      variant="outlined"
                      prepend-inner-icon="mdi-phone-outline"
                      class="mb-2"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.department"
                      label="Department"
                      variant="outlined"
                      class="mb-2"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="profileForm.profileImage"
                      label="Profile image URL"
                      variant="outlined"
                      prepend-inner-icon="mdi-image-outline"
                      hint="Optional. Use an uploaded image path or hosted image URL."
                      persistent-hint
                      class="mb-4"
                    ></v-text-field>
                  </v-col>
                </v-row>

                <div class="d-flex justify-end">
                  <v-btn
                    color="primary"
                    variant="flat"
                    elevation="0"
                    :loading="auth.loading"
                    @click="saveProfile"
                  >
                    Save Profile
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <v-card class="admin-card mb-4" elevation="0">
              <v-card-text class="pa-5">
                <div class="section-title mb-1">Role and access</div>
                <div class="section-caption mb-4">Your current administrative scope.</div>

                <div class="detail-row">
                  <span>Role</span>
                  <strong>{{ auth.roleLabel }}</strong>
                </div>
                <div class="detail-row">
                  <span>Department</span>
                  <strong>{{ auth.currentAdmin?.department || '—' }}</strong>
                </div>
                <div class="detail-row">
                  <span>Last login</span>
                  <strong>{{ formatDate(auth.currentAdmin?.lastLogin) || '—' }}</strong>
                </div>
                <div class="detail-row">
                  <span>Email verified</span>
                  <strong>{{ auth.currentAdmin?.emailVerified ? 'Yes' : 'No' }}</strong>
                </div>

                <v-divider class="my-3"></v-divider>

                <div class="text-caption text-medium-emphasis mb-2">Permissions</div>
                <div v-if="auth.isSuperAdmin" class="text-body-2">
                  Full access to every administration function.
                </div>
                <div v-else-if="auth.currentAdmin?.permissions?.length" class="d-flex flex-wrap ga-1">
                  <v-chip
                    v-for="permission in auth.currentAdmin.permissions"
                    :key="permission"
                    size="x-small"
                    variant="outlined"
                  >
                    {{ permission.replaceAll('_', ' ') }}
                  </v-chip>
                </div>
                <div v-else class="text-body-2 text-medium-emphasis">
                  No additional permissions assigned.
                </div>
              </v-card-text>
            </v-card>

            <v-card class="admin-card" elevation="0">
              <v-card-text class="pa-5">
                <div class="section-title mb-1">Need a change?</div>
                <div class="section-caption mb-3">
                  Contact a super administrator to change your role, permissions,
                  or CITAD email address.
                </div>
                <v-btn variant="outlined" color="primary" size="small" to="/admins">
                  View Administrators
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ----------------------------------------------------------- Security -->
      <v-window-item value="security">
        <v-row dense>
          <v-col cols="12" lg="7">
            <v-card class="admin-card" elevation="0">
              <v-card-text class="pa-6">
                <div class="section-title mb-1">Change password</div>
                <div class="section-caption mb-5">
                  Use at least 8 characters. Choose a password you do not use on
                  other services.
                </div>

                <v-form ref="passwordFormRef" @submit.prevent="changePassword">
                  <v-text-field
                    v-model="passwordForm.currentPassword"
                    label="Current password"
                    :type="showCurrent ? 'text' : 'password'"
                    :append-inner-icon="showCurrent ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                    variant="outlined"
                    autocomplete="current-password"
                    :rules="[required('Current password')]"
                    class="mb-2"
                    @click:append-inner="showCurrent = !showCurrent"
                  ></v-text-field>

                  <v-text-field
                    v-model="passwordForm.newPassword"
                    label="New password"
                    :type="showNew ? 'text' : 'password'"
                    :append-inner-icon="showNew ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                    variant="outlined"
                    autocomplete="new-password"
                    :rules="passwordRules"
                    class="mb-2"
                    @click:append-inner="showNew = !showNew"
                  ></v-text-field>

                  <v-text-field
                    v-model="passwordForm.confirmPassword"
                    label="Confirm new password"
                    :type="showNew ? 'text' : 'password'"
                    variant="outlined"
                    autocomplete="new-password"
                    :rules="confirmRules"
                    class="mb-4"
                  ></v-text-field>

                  <div class="d-flex justify-end">
                    <v-btn
                      type="submit"
                      color="primary"
                      variant="flat"
                      elevation="0"
                      :loading="changingPassword"
                    >
                      Update Password
                    </v-btn>
                  </div>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="5">
            <v-card class="admin-card mb-4" elevation="0">
              <v-card-text class="pa-5">
                <div class="section-title mb-1">Account security</div>
                <div class="section-caption mb-4">Current protection status.</div>

                <div class="detail-row">
                  <span>Two-factor auth</span>
                  <v-chip
                    size="small"
                    :color="auth.currentAdmin?.otpEnabled ? 'success' : 'warning'"
                    variant="tonal"
                  >
                    {{ auth.currentAdmin?.otpEnabled ? 'Enabled' : 'Disabled' }}
                  </v-chip>
                </div>
                <div class="detail-row">
                  <span>Account status</span>
                  <v-chip size="small" color="success" variant="tonal">
                    {{ auth.currentAdmin?.status || 'Active' }}
                  </v-chip>
                </div>
                <div class="detail-row">
                  <span>Last login</span>
                  <strong>{{ formatDate(auth.currentAdmin?.lastLogin) || '—' }}</strong>
                </div>
                <div class="detail-row">
                  <span>Failed attempts</span>
                  <strong>{{ auth.currentAdmin?.loginAttempts || 0 }}</strong>
                </div>
                <div class="detail-row">
                  <span>Password changed</span>
                  <strong>{{ formatDate(auth.currentAdmin?.passwordChangedAt) || '—' }}</strong>
                </div>
              </v-card-text>
            </v-card>

            <v-card class="admin-card" elevation="0">
              <v-card-text class="pa-5">
                <div class="section-title mb-1">Session</div>
                <div class="section-caption mb-3">
                  Signing out clears this browser's administrator session. Any
                  queued scanner entries stay on this device.
                </div>
                <v-btn variant="outlined" color="error" size="small" prepend-icon="mdi-logout" @click="signOut">
                  Sign Out
                </v-btn>
              </v-card-text>
            </v-card>

            <v-card class="admin-card mt-4" elevation="0">
              <v-card-text class="pa-5">
                <div class="section-title mb-1">Two-factor authentication</div>
                <div class="section-caption mb-3">
                  <span v-if="auth.currentAdmin?.role === 'super_admin'">
                    Required for super administrators.
                  </span>
                  Use an authenticator app for sign-in and keep recovery codes
                  somewhere safe.
                </div>

                <div class="detail-row">
                  <span>Status</span>
                  <v-chip
                    size="small"
                    :color="auth.currentAdmin?.otpEnabled ? 'success' : 'warning'"
                    variant="tonal"
                  >
                    {{ auth.currentAdmin?.otpEnabled ? 'Enrolled' : 'Not enrolled' }}
                  </v-chip>
                </div>

                <v-btn
                  v-if="auth.currentAdmin?.otpEnabled"
                  class="mt-4"
                  variant="outlined"
                  color="primary"
                  size="small"
                  prepend-icon="mdi-refresh"
                  @click="openRecoveryDialog"
                >
                  Regenerate recovery codes
                </v-btn>
                <div v-else class="text-caption text-medium-emphasis mt-3">
                  <span v-if="auth.currentAdmin?.role === 'super_admin'">
                    Super administrators are enrolled during their next sign-in.
                  </span>
                  <span v-else>
                    Two-factor authentication is optional for this account.
                  </span>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ---------------------------------------------------------- Audit log -->
      <v-window-item value="audit">
        <v-card class="admin-card mb-4" elevation="0">
          <v-card-text class="pa-4">
            <v-row dense align="center">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="auditFilters.action"
                  label="Filter by action"
                  placeholder="create, update, delete, export"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="auditFilters.resource"
                  label="Filter by resource"
                  placeholder="event, user, admin, certificate"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4" class="d-flex justify-md-end align-center ga-2">
                <v-btn variant="outlined" color="primary" prepend-icon="mdi-magnify" :loading="auditLoading" @click="loadAudit">
                  Search
                </v-btn>
                <v-chip variant="tonal" color="primary" size="small">
                  {{ auditPagination.total }} entries
                </v-chip>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-alert v-if="auditError" type="error" variant="tonal" class="mb-4" closable @click:close="auditError = null">
          {{ auditError }}
        </v-alert>

        <v-card class="admin-card" elevation="0">
          <v-table v-if="auditLoading || auditLogs.length" class="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Administrator</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
                <th>IP address</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="auditLoading">
                <tr v-for="index in 6" :key="index">
                  <td colspan="6"><v-skeleton-loader type="text" class="pa-0"></v-skeleton-loader></td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="(log, index) in auditLogs" :key="`${log.timestamp}-${index}`">
                  <td style="min-width: 160px" class="text-body-2">
                    {{ log.timestamp ? formatDateTime(log.timestamp) : '—' }}
                  </td>
                  <td style="min-width: 170px">{{ log.adminEmail || '—' }}</td>
                  <td>
                    <v-chip size="small" variant="tonal" color="primary" class="text-capitalize">
                      {{ log.action }}
                    </v-chip>
                  </td>
                  <td class="text-capitalize">{{ log.resource || '—' }}</td>
                  <td style="max-width: 380px" class="text-body-2">
                    {{ formatAuditDetails(log.details) }}
                  </td>
                  <td class="mono text-caption">{{ log.ipAddress || '—' }}</td>
                </tr>
              </template>
            </tbody>
          </v-table>

          <EmptyState
            v-else
            icon="mdi-history"
            title="No audit entries found"
            message="Administrative actions will be recorded here as the team works."
          />

          <v-divider v-if="auditPagination.totalPages > 1"></v-divider>
          <div v-if="auditPagination.totalPages > 1" class="d-flex justify-center py-4">
            <v-pagination
              v-model="auditFilters.page"
              :length="auditPagination.totalPages"
              :total-visible="6"
              density="comfortable"
              @update:model-value="loadAudit"
            ></v-pagination>
          </div>
        </v-card>
      </v-window-item>

      <!-- ------------------------------------------------------------- System -->
      <v-window-item value="system">
        <v-row dense>
          <v-col cols="12" lg="7">
            <v-card class="admin-card mb-4" elevation="0">
              <v-card-text class="pa-6">
                <div class="d-flex align-center justify-space-between mb-4">
                  <div>
                    <div class="section-title">System health</div>
                    <div class="section-caption">
                      Live status reported by the backend.
                    </div>
                  </div>
                  <v-chip
                    :color="health?.status === 'healthy' ? 'success' : 'error'"
                    variant="tonal"
                    size="small"
                    prepend-icon="mdi-circle"
                  >
                    {{ health?.status || 'Checking' }}
                  </v-chip>
                </div>

                <div v-if="healthLoading" class="py-4 text-center">
                  <v-progress-circular indeterminate color="primary" size="30"></v-progress-circular>
                </div>

                <template v-else-if="health">
                  <div class="service-row">
                    <div class="d-flex align-center ga-2">
                      <v-icon size="18" color="primary">mdi-database-outline</v-icon>
                      <span>Database</span>
                    </div>
                    <v-chip size="small" :color="statusColor(health.database?.status)" variant="tonal">
                      {{ health.database?.status || 'unknown' }}
                    </v-chip>
                  </div>

                  <div
                    v-for="(state, service) in health.services || {}"
                    :key="service"
                    class="service-row"
                  >
                    <div class="d-flex align-center ga-2 text-capitalize">
                      <v-icon size="18" color="primary">{{ serviceIcon(service) }}</v-icon>
                      <span>{{ service }}</span>
                    </div>
                    <v-chip size="small" :color="statusColor(state)" variant="tonal">
                      {{ state }}
                    </v-chip>
                  </div>

                  <div class="text-caption text-medium-emphasis mt-3">
                    Reported {{ formatDateTime(health.timestamp) }}
                  </div>
                </template>

                <v-alert v-else type="warning" variant="tonal" density="comfortable">
                  System status could not be loaded. Check the API connection and try again.
                </v-alert>
              </v-card-text>
            </v-card>

            <v-card class="admin-card" elevation="0">
              <v-card-text class="pa-6">
                <div class="section-title mb-1">Portal information</div>
                <div class="section-caption mb-4">
                  Runtime details for this administration build.
                </div>

                <div class="detail-row">
                  <span>Application</span>
                  <strong>meetCITAD Administration</strong>
                </div>
                <div class="detail-row">
                  <span>Environment</span>
                  <strong class="text-capitalize">{{ buildMode }}</strong>
                </div>
                <div class="detail-row">
                  <span>API base URL</span>
                  <strong class="mono">{{ apiBaseUrl }}</strong>
                </div>
                <div class="detail-row">
                  <span>Public site</span>
                  <strong class="mono">{{ publicSiteUrl }}</strong>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="5">
            <v-card class="admin-card mb-4" elevation="0">
              <v-card-text class="pa-5">
                <div class="section-title mb-1">Operational notes</div>
                <div class="section-caption mb-4">
                  Services with external dependencies.
                </div>

                <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                  Email and SMS require configured provider credentials. In-app
                  notifications are always available.
                </v-alert>
                <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                  Certificate PDF storage must be writable by the backend process.
                </v-alert>
                <v-alert type="info" variant="tonal" density="compact">
                  Attendance scanning works best on HTTPS or localhost because
                  browsers restrict camera access on insecure origins.
                </v-alert>
              </v-card-text>
            </v-card>

            <v-card class="admin-card" elevation="0">
              <v-card-text class="pa-5">
                <div class="section-title mb-1">Audit retention</div>
                <div class="section-caption mb-3">
                  Administrative actions are retained in each administrator's
                  audit trail. Export records regularly for long-term storage.
                </div>
                <v-btn variant="outlined" color="primary" size="small" prepend-icon="mdi-history" @click="tab = 'audit'">
                  Open Audit Log
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- -------------------------------------------------------- Data export -->
      <v-window-item value="export">
        <v-alert type="info" variant="tonal" density="comfortable" class="mb-5" icon="mdi-information-outline">
          Exports include the full dataset for the selected record type. Files are
          generated in this browser and are not stored on the server.
        </v-alert>

        <v-row dense>
          <v-col v-for="item in exportTypes" :key="item.type" cols="12" md="6">
            <v-card class="admin-card export-card" elevation="0">
              <v-card-text class="pa-5">
                <div class="d-flex align-start gap-3">
                  <div class="export-icon">
                    <v-icon size="22" color="primary">{{ item.icon }}</v-icon>
                  </div>
                  <div class="flex-grow-1">
                    <div class="section-title">{{ item.title }}</div>
                    <div class="section-caption mb-3">{{ item.description }}</div>

                    <div v-if="lastExport?.type === item.type" class="text-caption text-success mb-2">
                      Last export: {{ lastExport.count }} record(s)
                      <span v-if="lastExport.format === 'json'">as JSON</span>
                      <span v-else>as CSV</span>
                    </div>

                    <div class="d-flex flex-wrap ga-2">
                      <v-btn
                        size="small"
                        variant="outlined"
                        color="primary"
                        prepend-icon="mdi-code-json"
                        :loading="exporting === `${item.type}-json`"
                        @click="runExport(item.type, 'json')"
                      >
                        JSON
                      </v-btn>
                      <v-btn
                        size="small"
                        variant="outlined"
                        color="primary"
                        prepend-icon="mdi-file-delimited-outline"
                        :loading="exporting === `${item.type}-csv`"
                        @click="runExport(item.type, 'csv')"
                      >
                        CSV
                      </v-btn>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <v-dialog v-model="recoveryDialog" max-width="520" persistent>
      <v-card class="admin-card">
        <v-card-title class="pt-5 px-5">
          {{ newRecoveryCodes.length ? 'New recovery codes' : 'Regenerate recovery codes' }}
        </v-card-title>
        <v-card-text class="px-5">
          <template v-if="!newRecoveryCodes.length">
            <v-alert
              type="warning"
              variant="tonal"
              density="comfortable"
              class="mb-4"
              icon="mdi-alert-outline"
            >
              This replaces every existing recovery code. The old codes will stop
              working immediately.
            </v-alert>

            <v-text-field
              v-model="recoveryForm.password"
              label="Current password"
              :type="showRecoveryPassword ? 'text' : 'password'"
              :append-inner-icon="showRecoveryPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              variant="outlined"
              autocomplete="current-password"
              class="mb-3"
              @click:append-inner="showRecoveryPassword = !showRecoveryPassword"
            ></v-text-field>

            <v-text-field
              v-model="recoveryForm.code"
              label="6-digit authenticator code"
              placeholder="000000"
              variant="outlined"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
            ></v-text-field>
          </template>

          <template v-else>
            <v-alert
              type="success"
              variant="tonal"
              density="comfortable"
              class="mb-4"
              icon="mdi-shield-check-outline"
            >
              Store these codes somewhere safe. Each code can be used once.
            </v-alert>
            <div class="recovery-code-grid">
              <code v-for="code in newRecoveryCodes" :key="code">{{ code }}</code>
            </div>
          </template>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            :disabled="regeneratingRecoveryCodes"
            @click="closeRecoveryDialog"
          >
            {{ newRecoveryCodes.length ? 'Done' : 'Cancel' }}
          </v-btn>
          <v-btn
            v-if="!newRecoveryCodes.length"
            color="primary"
            variant="flat"
            :loading="regeneratingRecoveryCodes"
            @click="regenerateRecoveryCodes"
          >
            Generate codes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3500"
      location="bottom right"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api, { getErrorMessage } from '@/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { downloadCsv, downloadJson, filenameTimestamp, slug } from '@/utils/download'

const router = useRouter()
const auth = useAuthStore()

const tab = ref('profile')
const changingPassword = ref(false)
const showCurrent = ref(false)
const showNew = ref(false)
const passwordFormRef = ref(null)

const health = ref(null)
const healthLoading = ref(false)

const auditLoading = ref(true)
const auditError = ref(null)
const auditLogs = ref([])
const auditPagination = reactive({ total: 0, totalPages: 1 })
const auditFilters = reactive({ action: '', resource: '', page: 1, limit: 25 })

const exporting = ref('')
const lastExport = ref(null)

const snackbar = reactive({ show: false, message: '', color: 'success' })

const profileForm = reactive({
  fullname: '',
  email: '',
  phone: '',
  department: '',
  profileImage: '',
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const recoveryDialog = ref(false)
const regeneratingRecoveryCodes = ref(false)
const showRecoveryPassword = ref(false)
const newRecoveryCodes = ref([])
const recoveryForm = reactive({
  password: '',
  code: '',
})

const buildMode = import.meta.env.MODE
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const publicSiteUrl = computed(
  () =>
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    (import.meta.env.DEV ? 'http://localhost:5173' : window.location.origin)
)

const required = (label) => (value) =>
  Boolean(String(value || '').trim()) || `${label} is required`

const passwordRules = [
  (value) => Boolean(value) || 'New password is required',
  (value) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value || '') ||
    'Use 8+ characters with upper, lower, number, and symbol',
  (value) =>
    value !== passwordForm.currentPassword ||
    'Choose a password different from your current one',
]

const confirmRules = [
  (value) => Boolean(value) || 'Confirm the new password',
  (value) => value === passwordForm.newPassword || 'Passwords do not match',
]

const exportTypes = [
  {
    type: 'users',
    title: 'Participant accounts',
    description: 'Profiles, status, preferences, and participation statistics.',
    icon: 'mdi-account-group-outline',
  },
  {
    type: 'events',
    title: 'Events',
    description: 'Event details, registrations, attendance, and publishing state.',
    icon: 'mdi-calendar-text-outline',
  },
  {
    type: 'certificates',
    title: 'Certificates',
    description: 'Issued certificates, recipients, events, and verification data.',
    icon: 'mdi-certificate-outline',
  },
  {
    type: 'feedback',
    title: 'Feedback',
    description: 'Ratings, comments, NPS scores, and administrator responses.',
    icon: 'mdi-message-text-outline',
  },
]

function hydrateProfile() {
  const admin = auth.currentAdmin || {}
  profileForm.fullname = admin.fullname || ''
  profileForm.email = admin.email || ''
  profileForm.phone = admin.phone || ''
  profileForm.department = admin.department || ''
  profileForm.profileImage = admin.profileImage || ''
}

function showMessage(message, color = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

const saveProfile = async () => {
  if (!profileForm.fullname.trim()) {
    showMessage('Full name is required.', 'error')
    return
  }

  try {
    await auth.updateProfile({
      fullname: profileForm.fullname.trim(),
      phone: profileForm.phone.trim(),
      department: profileForm.department.trim(),
      profileImage: profileForm.profileImage.trim(),
    })
    hydrateProfile()
    showMessage('Profile updated.')
  } catch (error) {
    showMessage(getErrorMessage(error, 'Could not update your profile.'), 'error')
  }
}

const changePassword = async () => {
  const { valid } = await passwordFormRef.value.validate()
  if (!valid) return

  changingPassword.value = true
  try {
    await auth.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    showMessage('Password updated. Please sign in again.')
    router.replace({ path: '/login', query: { reason: 'password-changed' } })
  } catch (error) {
    showMessage(getErrorMessage(error, 'Could not change your password.'), 'error')
  } finally {
    changingPassword.value = false
  }
}

const openRecoveryDialog = () => {
  recoveryForm.password = ''
  recoveryForm.code = ''
  newRecoveryCodes.value = []
  showRecoveryPassword.value = false
  recoveryDialog.value = true
}

const closeRecoveryDialog = () => {
  recoveryDialog.value = false
  recoveryForm.password = ''
  recoveryForm.code = ''
  newRecoveryCodes.value = []
  showRecoveryPassword.value = false
}

const regenerateRecoveryCodes = async () => {
  if (!recoveryForm.password) {
    showMessage('Enter your current password.', 'error')
    return
  }
  if (!/^\d{6}$/.test(recoveryForm.code || '')) {
    showMessage('Enter the 6-digit code from your authenticator app.', 'error')
    return
  }

  regeneratingRecoveryCodes.value = true
  try {
    const result = await auth.regenerateRecoveryCodes(
      recoveryForm.password,
      recoveryForm.code
    )
    newRecoveryCodes.value = result?.recoveryCodes || []
    recoveryForm.password = ''
    recoveryForm.code = ''
    if (!newRecoveryCodes.value.length) {
      showMessage('Recovery codes could not be generated.', 'error')
    }
  } catch (error) {
    showMessage(
      getErrorMessage(error, 'Could not regenerate recovery codes.'),
      'error'
    )
  } finally {
    regeneratingRecoveryCodes.value = false
  }
}

const loadHealth = async () => {
  healthLoading.value = true
  try {
    health.value = await api.admin.health()
  } catch (error) {
    health.value = null
    showMessage(getErrorMessage(error, 'Could not load system health.'), 'error')
  } finally {
    healthLoading.value = false
  }
}

const loadAudit = async () => {
  auditLoading.value = true
  auditError.value = null

  try {
    const params = { page: auditFilters.page, limit: auditFilters.limit }
    if (auditFilters.action.trim()) params.action = auditFilters.action.trim()
    if (auditFilters.resource.trim()) params.resource = auditFilters.resource.trim()

    const result = await api.admin.audit(params)
    auditLogs.value = result.logs || []
    auditPagination.total = result.total || 0
    auditPagination.totalPages = result.totalPages || 1
  } catch (error) {
    auditError.value = getErrorMessage(error, 'Could not load the audit log.')
  } finally {
    auditLoading.value = false
  }
}

const formatAuditDetails = (details) => {
  if (details === null || details === undefined || details === '') return '—'
  if (typeof details === 'string') return details
  if (typeof details === 'object') {
    const text = Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' · ')
    return text || '—'
  }
  return String(details)
}

const statusColor = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (['healthy', 'connected', 'operational', 'active', 'up'].includes(normalized)) {
    return 'success'
  }
  if (['degraded', 'warning', 'pending'].includes(normalized)) return 'warning'
  if (['down', 'error', 'failed', 'disconnected'].includes(normalized)) return 'error'
  return 'grey'
}

const serviceIcon = (service) => {
  const icons = {
    email: 'mdi-email-outline',
    sms: 'mdi-message-text-outline',
    storage: 'mdi-harddisk',
    payments: 'mdi-credit-card-outline',
  }
  return icons[service] || 'mdi-cog-outline'
}

const flattenExportRow = (row = {}) => {
  const flat = {}
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      flat[key] = ''
    } else if (typeof value === 'object') {
      flat[key] = JSON.stringify(value)
    } else {
      flat[key] = value
    }
  }
  return flat
}

const runExport = async (type, format) => {
  exporting.value = `${type}-${format}`
  try {
    const result = await api.admin.exportData(type, format)
    const rows = Array.isArray(result.data) ? result.data : []
    const filenameBase = `${slug(type)}-export-${filenameTimestamp()}`

    if (format === 'csv') {
      const flatRows = rows.map(flattenExportRow)
      const columns = Object.keys(flatRows[0] || {}).map((key) => ({
        key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
      }))
      if (!columns.length) {
        showMessage('There is no data to export yet.', 'warning')
        return
      }
      downloadCsv(`${filenameBase}.csv`, columns, flatRows)
    } else {
      downloadJson(
        { type: result.type || type, count: rows.length, exportedAt: new Date().toISOString(), data: rows },
        `${filenameBase}.json`
      )
    }

    lastExport.value = { type, format, count: rows.length }
    showMessage(`${type} data exported as ${format.toUpperCase()}.`)
  } catch (error) {
    showMessage(getErrorMessage(error, `Could not export ${type}.`), 'error')
  } finally {
    exporting.value = ''
  }
}

const signOut = async () => {
  await auth.logout()
  router.push('/login')
}

watch(tab, (value) => {
  if (value === 'audit' && !auditLogs.value.length) loadAudit()
  if (value === 'system' && !health.value) loadHealth()
})

onMounted(() => {
  hydrateProfile()
  loadHealth()
})
</script>

<style scoped>
.admin-tabs {
  border-bottom: 1px solid var(--admin-border);
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 18px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--admin-border);
}

.detail-row:last-child {
  border-bottom: 0;
}

.detail-row span {
  color: var(--admin-muted);
}

.recovery-code-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.recovery-code-grid code {
  padding: 8px;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  text-align: center;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.detail-row strong {
  text-align: right;
  font-weight: 600;
}

.service-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--admin-border);
  font-size: 0.84rem;
}

.service-row:last-of-type {
  border-bottom: 0;
}

.export-card {
  height: 100%;
}

.export-icon {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  background: rgba(15, 42, 68, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.v-theme--dark .export-icon {
  background: rgba(201, 164, 76, 0.14);
}

@media (max-width: 600px) {
  .profile-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
