<template>
  <div>
    <PageHeader
      title="Users"
      subtitle="Search participant accounts, review participation, and manage account access."
      icon="mdi-account-group-outline"
    >
      <template #actions>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="load">
          Refresh
        </v-btn>
      </template>
    </PageHeader>

    <v-card class="admin-card mb-4" elevation="0">
      <v-card-text class="pa-4">
        <v-row dense align="center">
          <v-col cols="12" md="5">
            <v-text-field
              v-model="filters.search"
              label="Search users"
              placeholder="Name, email, or phone"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            ></v-text-field>
          </v-col>
          <v-col cols="6" md="3">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="comfortable"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filters.limit"
              :items="[10, 20, 50]"
              label="Rows"
              variant="outlined"
              density="comfortable"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="12" md="2" class="d-flex justify-md-end align-center">
            <v-chip variant="tonal" color="primary" size="small">
              {{ pagination.total }} user{{ pagination.total === 1 ? '' : 's' }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <v-card class="admin-card" elevation="0">
      <v-table v-if="loading || users.length" class="admin-table" hover>
        <thead>
          <tr>
            <th>User</th>
            <th>Contact</th>
            <th>Organisation</th>
            <th>Status</th>
            <th>Verified</th>
            <th>Joined</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="index in 6" :key="index">
              <td colspan="7"><v-skeleton-loader type="text" class="pa-0"></v-skeleton-loader></td>
            </tr>
          </template>

          <template v-else>
            <tr
              v-for="user in users"
              :key="user._id"
              class="clickable-row"
              @click="$router.push(`/users/${user._id}`)"
            >
              <td style="min-width: 210px">
                <div class="d-flex align-center ga-3">
                  <v-avatar size="36" color="primary" class="text-on-primary font-weight-bold">
                    <v-img v-if="user.profileImage" :src="resolveMediaUrl(user.profileImage)" cover></v-img>
                    <template v-else>{{ initials(user.fullname) }}</template>
                  </v-avatar>
                  <div>
                    <div class="font-weight-medium">{{ user.fullname }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ user.participantType || 'Participant' }}
                    </div>
                  </div>
                </div>
              </td>
              <td style="min-width: 190px">
                <div class="text-body-2">{{ user.email }}</div>
                <div class="text-caption text-medium-emphasis">{{ user.phone || 'No phone' }}</div>
              </td>
              <td style="min-width: 160px">{{ user.organisation || '—' }}</td>
              <td><StatusChip :status="user.status" /></td>
              <td>
                <v-icon :color="user.emailVerified ? 'success' : 'grey'" size="19">
                  {{ user.emailVerified ? 'mdi-check-decagram' : 'mdi-email-off-outline' }}
                </v-icon>
              </td>
              <td>{{ formatDate(user.createdAt) }}</td>
              <td class="text-right" @click.stop>
                <v-menu location="bottom end">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" aria-label="User actions"></v-btn>
                  </template>

                  <v-list density="compact" min-width="190">
                    <v-list-item
                      prepend-icon="mdi-eye-outline"
                      title="View profile"
                      :to="`/users/${user._id}`"
                    ></v-list-item>
                    <v-list-item
                      v-if="user.status === 'active'"
                      prepend-icon="mdi-pause-circle-outline"
                      title="Suspend account"
                      @click="openStatus(user, 'suspended')"
                    ></v-list-item>
                    <v-list-item
                      v-else
                      prepend-icon="mdi-play-circle-outline"
                      title="Activate account"
                      @click="openStatus(user, 'active')"
                    ></v-list-item>
                    <v-divider></v-divider>
                    <v-list-item
                      prepend-icon="mdi-delete-outline"
                      title="Delete account"
                      @click="openDelete(user)"
                    ></v-list-item>
                  </v-list>
                </v-menu>
              </td>
            </tr>
          </template>
        </tbody>
      </v-table>

      <EmptyState
        v-else
        icon="mdi-account-search-outline"
        title="No users found"
        message="Try a different search term or status filter."
      />

      <v-divider v-if="pagination.totalPages > 1"></v-divider>
      <div v-if="pagination.totalPages > 1" class="d-flex justify-center py-4">
        <v-pagination
          v-model="filters.page"
          :length="pagination.totalPages"
          :total-visible="6"
          density="comfortable"
          @update:model-value="load"
        ></v-pagination>
      </div>
    </v-card>

    <ConfirmDialog
      v-model="statusDialog.show"
      :title="statusDialog.status === 'active' ? 'Activate this account?' : 'Suspend this account?'"
      :confirm-text="statusDialog.status === 'active' ? 'Activate' : 'Suspend'"
      :color="statusDialog.status === 'active' ? 'success' : 'warning'"
      :loading="statusDialog.loading"
      @confirm="confirmStatus"
    >
      <strong>{{ statusDialog.user?.fullname }}</strong>
      will be
      {{ statusDialog.status === 'active' ? 'able to sign in and register for events again.' : 'unable to sign in or register until reactivated.' }}
    </ConfirmDialog>

    <ConfirmDialog
      v-model="deleteDialog.show"
      title="Delete this account?"
      confirm-text="Delete"
      color="error"
      :loading="deleteDialog.loading"
      @confirm="confirmDelete"
    >
      <strong>{{ deleteDialog.user?.fullname }}</strong> will be soft-deleted and
      signed out. Event records remain available for reporting.
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import StatusChip from '@/components/StatusChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDate } from '@/utils/formatters'
import { resolveMediaUrl } from '@/utils/normalizers'

const { notifySuccess, notifyError } = useSnackbar()

const loading = ref(true)
const error = ref(null)
const users = ref([])
const pagination = reactive({ page: 1, total: 0, totalPages: 1 })

const filters = reactive({
  search: '',
  status: 'all',
  page: 1,
  limit: 20,
})

const statusOptions = [
  { title: 'All statuses', value: 'all' },
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Suspended', value: 'suspended' },
  { title: 'Deleted', value: 'deleted' },
]

const statusDialog = reactive({
  show: false,
  user: null,
  status: 'suspended',
  loading: false,
})

const deleteDialog = reactive({ show: false, user: null, loading: false })

const initials = (name = '') =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

const load = async () => {
  loading.value = true
  error.value = null

  try {
    const params = {
      page: filters.page,
      limit: filters.limit,
      sort: '-createdAt',
    }
    if (filters.search.trim()) params.search = filters.search.trim()
    if (filters.status !== 'all') params.status = filters.status

    const result = await api.admin.users(params)
    users.value = result.users || []
    pagination.page = result.page
    pagination.total = result.total
    pagination.totalPages = result.totalPages
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load users.')
  } finally {
    loading.value = false
  }
}

let searchTimer
watch(
  () => filters.search,
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      filters.page = 1
      load()
    }, 350)
  }
)

watch(
  () => [filters.status, filters.limit],
  () => {
    filters.page = 1
    load()
  }
)

const openStatus = (user, status) => {
  statusDialog.user = user
  statusDialog.status = status
  statusDialog.show = true
}

const confirmStatus = async () => {
  if (!statusDialog.user) return
  statusDialog.loading = true

  try {
    const updated = await api.admin.updateUserStatus(statusDialog.user._id, statusDialog.status)
    const index = users.value.findIndex((user) => user._id === statusDialog.user._id)
    if (index >= 0 && updated) users.value[index] = updated
    statusDialog.show = false
    notifySuccess(`Account ${statusDialog.status === 'active' ? 'activated' : 'suspended'}.`)
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not update the account status.'))
  } finally {
    statusDialog.loading = false
  }
}

const openDelete = (user) => {
  deleteDialog.user = user
  deleteDialog.show = true
}

const confirmDelete = async () => {
  if (!deleteDialog.user) return
  deleteDialog.loading = true

  try {
    await api.admin.deleteUser(deleteDialog.user._id)
    notifySuccess('User account deleted.')
    deleteDialog.show = false
    load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not delete the account.'))
  } finally {
    deleteDialog.loading = false
  }
}

onMounted(load)
</script>
