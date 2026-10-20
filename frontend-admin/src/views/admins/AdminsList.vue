<template>
  <div>
    <PageHeader
      title="Administrators"
      subtitle="Manage staff access, roles, and permissions for the meetCITAD administration portal."
      icon="mdi-shield-account-outline"
    >
      <template #actions>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="load">
          Refresh
        </v-btn>
        <v-btn
          v-if="auth.isSuperAdmin"
          color="accent"
          variant="flat"
          elevation="0"
          prepend-icon="mdi-account-plus-outline"
          @click="openCreate"
        >
          New Administrator
        </v-btn>
      </template>
    </PageHeader>

    <v-alert v-if="!auth.isSuperAdmin" type="info" variant="tonal" class="mb-4" icon="mdi-lock-outline">
      Only super administrators can create administrators or change roles and
      permissions. You can review the current team below.
    </v-alert>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <v-card class="admin-card" elevation="0">
      <v-table v-if="loading || admins.length" class="admin-table" hover>
        <thead>
          <tr>
            <th>Administrator</th>
            <th>Role</th>
            <th>Permissions</th>
            <th>Department</th>
            <th>Status</th>
            <th>Last login</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="index in 5" :key="index">
              <td colspan="7"><v-skeleton-loader type="text" class="pa-0"></v-skeleton-loader></td>
            </tr>
          </template>

          <template v-else>
            <tr v-for="admin in admins" :key="admin._id">
              <td style="min-width: 210px">
                <div class="d-flex align-center ga-3">
                  <v-avatar size="36" color="primary" class="text-white font-weight-bold">
                    {{ initials(admin.fullname) }}
                  </v-avatar>
                  <div>
                    <div class="font-weight-medium">
                      {{ admin.fullname }}
                      <v-chip v-if="isSelf(admin)" size="x-small" variant="tonal" class="ml-1">You</v-chip>
                    </div>
                    <div class="text-caption text-medium-emphasis">{{ admin.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <v-chip size="small" :color="roleColor(admin.role)" variant="tonal">
                  {{ roleLabel(admin.role) }}
                </v-chip>
              </td>
              <td style="max-width: 260px">
                <div v-if="admin.role === 'super_admin'" class="text-caption text-medium-emphasis">
                  Full system access
                </div>
                <div v-else-if="!admin.permissions?.length" class="text-caption text-medium-emphasis">
                  No additional permissions
                </div>
                <div v-else class="d-flex flex-wrap ga-1">
                  <v-chip
                    v-for="permission in admin.permissions.slice(0, 3)"
                    :key="permission"
                    size="x-small"
                    variant="outlined"
                  >
                    {{ permissionLabel(permission) }}
                  </v-chip>
                  <v-chip v-if="admin.permissions.length > 3" size="x-small" variant="outlined">
                    +{{ admin.permissions.length - 3 }}
                  </v-chip>
                </div>
              </td>
              <td>{{ admin.department || '—' }}</td>
              <td><StatusChip :status="admin.status" /></td>
              <td>{{ formatDate(admin.lastLogin) || 'Never' }}</td>
              <td class="text-right">
                <v-btn
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  aria-label="Edit administrator"
                  :disabled="!auth.isSuperAdmin"
                  @click="openEdit(admin)"
                ></v-btn>
                <v-menu v-if="auth.isSuperAdmin && !isSelf(admin)" location="bottom end">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" aria-label="Administrator actions"></v-btn>
                  </template>
                  <v-list density="compact" min-width="190">
                    <v-list-item
                      :prepend-icon="admin.status === 'active' ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'"
                      :title="admin.status === 'active' ? 'Suspend access' : 'Activate access'"
                      @click="toggleStatus(admin)"
                    ></v-list-item>
                    <v-divider></v-divider>
                    <v-list-item
                      prepend-icon="mdi-delete-outline"
                      title="Delete administrator"
                      @click="openDelete(admin)"
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
        icon="mdi-shield-account-outline"
        title="No administrators found"
        message="Administrator accounts will appear here."
      />
    </v-card>

    <!-- Create / edit -->
    <v-dialog v-model="editor.show" max-width="620" persistent scrollable>
      <v-card class="admin-card" elevation="0">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-5 px-6">
          {{ editor.id ? 'Edit administrator' : 'New administrator' }}
        </v-card-title>

        <v-card-text class="px-6">
          <v-form ref="formRef">
            <v-text-field
              v-model="editor.form.fullname"
              label="Full name"
              variant="outlined"
              :rules="[(v) => Boolean(v && v.trim()) || 'Full name is required']"
              class="mb-2"
            ></v-text-field>

            <v-text-field
              v-model="editor.form.email"
              label="CITAD email"
              variant="outlined"
              :disabled="Boolean(editor.id)"
              :rules="emailRules"
              class="mb-2"
            ></v-text-field>

            <v-text-field
              v-if="!editor.id"
              v-model="editor.form.password"
              label="Temporary password"
              type="password"
              variant="outlined"
              autocomplete="new-password"
              hint="At least 8 characters. Share it securely with the administrator."
              persistent-hint
              :rules="passwordRules"
              class="mb-5"
            ></v-text-field>

            <v-row dense>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="editor.form.role"
                  :items="roleOptions"
                  label="Role"
                  variant="outlined"
                  :disabled="editor.id && !auth.isSuperAdmin"
                  @update:model-value="onRoleChange"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="editor.form.department"
                  label="Department"
                  variant="outlined"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-select
              v-if="editor.id"
              v-model="editor.form.status"
              :items="statusOptions"
              label="Account status"
              variant="outlined"
              class="mb-2"
            ></v-select>

            <div class="form-section-title mt-2">Permissions</div>
            <div class="form-section-caption">
              Super administrators have full access. Additional permissions apply
              to other roles.
            </div>

            <div v-if="editor.form.role === 'super_admin'" class="text-body-2 text-medium-emphasis mb-3">
              Full system access is granted automatically to super administrators.
            </div>

            <v-row v-else dense>
              <v-col v-for="permission in permissionOptions" :key="permission.value" cols="12" sm="6">
                <v-checkbox
                  v-model="editor.form.permissions"
                  :label="permission.title"
                  :value="permission.value"
                  color="primary"
                  density="compact"
                  hide-details
                ></v-checkbox>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="px-6 pb-5">
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="editor.saving" @click="editor.show = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="editor.saving"
            @click="saveAdmin"
          >
            {{ editor.id ? 'Save Changes' : 'Create Administrator' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="deleteDialog.show"
      title="Delete this administrator?"
      confirm-text="Delete"
      color="error"
      :loading="deleteDialog.loading"
      @confirm="confirmDelete"
    >
      <strong>{{ deleteDialog.admin?.fullname }}</strong> will lose access to the
      administration portal immediately. This cannot be undone.
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api, { getErrorMessage } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/composables/useSnackbar'
import PageHeader from '@/components/PageHeader.vue'
import StatusChip from '@/components/StatusChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDate } from '@/utils/formatters'

const auth = useAuthStore()
const { notifySuccess, notifyError } = useSnackbar()

const loading = ref(true)
const error = ref(null)
const admins = ref([])
const formRef = ref(null)

const roleOptions = [
  { title: 'Super Administrator', value: 'super_admin' },
  { title: 'Event Manager', value: 'event_manager' },
  { title: 'Staff', value: 'staff' },
  { title: 'Auditor', value: 'auditor' },
]

const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Suspended', value: 'suspended' },
]

const permissionOptions = [
  { title: 'Create events', value: 'create_event' },
  { title: 'Edit events', value: 'edit_event' },
  { title: 'Delete events', value: 'delete_event' },
  { title: 'Manage users', value: 'manage_users' },
  { title: 'View reports', value: 'view_reports' },
  { title: 'Generate certificates', value: 'generate_certificates' },
  { title: 'Send notifications', value: 'send_notifications' },
  { title: 'Manage administrators', value: 'manage_admins' },
  { title: 'View analytics', value: 'view_analytics' },
  { title: 'Export data', value: 'export_data' },
  { title: 'Manage settings', value: 'manage_settings' },
]

const defaultPermissions = {
  super_admin: [],
  event_manager: [
    'create_event',
    'edit_event',
    'delete_event',
    'view_reports',
    'generate_certificates',
    'send_notifications',
    'view_analytics',
    'export_data',
  ],
  staff: ['view_reports', 'generate_certificates', 'view_analytics'],
  auditor: ['view_reports', 'view_analytics'],
}

const blankForm = () => ({
  fullname: '',
  email: '',
  password: '',
  role: 'staff',
  department: '',
  status: 'active',
  permissions: [...defaultPermissions.staff],
})

const editor = reactive({
  show: false,
  id: null,
  saving: false,
  form: blankForm(),
})

const deleteDialog = reactive({ show: false, admin: null, loading: false })

const emailRules = [
  (v) => Boolean(v) || 'Email is required',
  (v) => /@citad\.(org|edu\.ng)$/i.test(v || '') || 'Use a CITAD email address',
]

const passwordRules = [
  (v) => Boolean(v) || 'Password is required',
  (v) => (v || '').length >= 8 || 'Password must be at least 8 characters',
]

const initials = (name = '') =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

const roleLabel = (role) =>
  roleOptions.find((option) => option.value === role)?.title || role

const roleColor = (role) =>
  ({ super_admin: 'primary', event_manager: 'info', staff: 'grey', auditor: 'warning' })[role] ||
  'grey'

const permissionLabel = (permission) =>
  permissionOptions.find((option) => option.value === permission)?.title || permission

const isSelf = (admin) => {
  const currentId = auth.currentAdmin?.id || auth.currentAdmin?._id
  return String(admin._id) === String(currentId)
}

const load = async () => {
  loading.value = true
  error.value = null

  try {
    const result = await api.admin.admins({ limit: 100 })
    admins.value = result.admins || []
  } catch (err) {
    error.value = getErrorMessage(err, 'Could not load administrators.')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editor.id = null
  editor.form = blankForm()
  editor.show = true
}

const openEdit = (admin) => {
  editor.id = admin._id
  editor.form = {
    fullname: admin.fullname || '',
    email: admin.email || '',
    password: '',
    role: admin.role || 'staff',
    department: admin.department || '',
    status: admin.status || 'active',
    permissions: [...(admin.permissions || [])],
  }
  editor.show = true
}

const onRoleChange = (role) => {
  if (editor.id) return
  editor.form.permissions = [...(defaultPermissions[role] || [])]
}

const saveAdmin = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  editor.saving = true
  try {
    const payload = {
      fullname: editor.form.fullname.trim(),
      role: editor.form.role,
      department: editor.form.department.trim(),
      permissions: editor.form.permissions,
    }

    if (editor.id) {
      payload.status = editor.form.status
      await api.admin.updateAdmin(editor.id, payload)
      notifySuccess('Administrator updated.')
    } else {
      await api.admin.createAdmin({
        ...payload,
        email: editor.form.email.trim(),
        password: editor.form.password,
      })
      notifySuccess('Administrator created.')
    }

    editor.show = false
    await load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not save the administrator.'))
  } finally {
    editor.saving = false
  }
}

const toggleStatus = async (admin) => {
  try {
    await api.admin.updateAdmin(admin._id, {
      status: admin.status === 'active' ? 'suspended' : 'active',
    })
    notifySuccess(`Administrator ${admin.status === 'active' ? 'suspended' : 'activated'}.`)
    await load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not update the administrator.'))
  }
}

const openDelete = (admin) => {
  deleteDialog.admin = admin
  deleteDialog.show = true
}

const confirmDelete = async () => {
  if (!deleteDialog.admin) return
  deleteDialog.loading = true
  try {
    await api.admin.deleteAdmin(deleteDialog.admin._id)
    notifySuccess('Administrator deleted.')
    deleteDialog.show = false
    await load()
  } catch (err) {
    notifyError(getErrorMessage(err, 'Could not delete the administrator.'))
  } finally {
    deleteDialog.loading = false
  }
}

onMounted(load)
</script>
