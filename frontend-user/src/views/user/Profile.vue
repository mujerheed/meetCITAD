<template>
  <div class="profile-page">
    <v-container class="py-8">
      <v-row class="mb-6">
        <v-col cols="12">
          <h1 class="text-h4 font-weight-bold mb-2">My Profile</h1>
          <p class="text-body-1 text-medium-emphasis">
            Manage your personal information, password and notification preferences.
          </p>
        </v-col>
      </v-row>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-6"
        closable
        @click:close="authStore.clearError()"
      >
        {{ error }}
      </v-alert>

      <v-row>
        <!-- Summary Card -->
        <v-col cols="12" md="4">
          <v-card class="pa-6 text-center summary-card" elevation="1">
            <div class="avatar-wrapper mx-auto mb-4">
              <v-avatar size="120" color="primary">
                <v-img
                  v-if="authStore.currentUser?.profilePicture"
                  :src="authStore.currentUser.profilePicture"
                  alt="Profile picture"
                  cover
                ></v-img>
                <span v-else class="text-h4 text-white">
                  {{ authStore.userInitials || 'U' }}
                </span>
              </v-avatar>

              <v-btn
                icon
                size="small"
                color="accent"
                class="avatar-edit"
                aria-label="Upload profile picture"
                :loading="uploading"
                @click="triggerFilePicker"
              >
                <v-icon size="18">mdi-camera</v-icon>
              </v-btn>

              <input
                ref="fileInput"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="d-none"
                @change="handleFileSelected"
              />
            </div>

            <h2 class="text-h6 font-weight-bold mb-1">
              {{ authStore.currentUser?.fullname || authStore.displayName }}
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-3">
              {{ authStore.currentUser?.email }}
            </p>

            <v-chip
              v-if="authStore.currentUser?.participantType"
              size="small"
              variant="tonal"
              color="primary"
              class="mb-4"
            >
              {{ authStore.currentUser.participantType }}
            </v-chip>

            <v-divider class="my-4"></v-divider>

            <v-row dense class="text-center">
              <v-col cols="6">
                <div class="text-h5 font-weight-bold">
                  {{ authStore.currentUser?.stats?.totalEventsAttended || 0 }}
                </div>
                <div class="text-caption text-medium-emphasis">Events Attended</div>
              </v-col>
              <v-col cols="6">
                <div class="text-h5 font-weight-bold">
                  {{ authStore.currentUser?.stats?.totalCertificates || 0 }}
                </div>
                <div class="text-caption text-medium-emphasis">Certificates</div>
              </v-col>
            </v-row>

            <v-btn
              v-if="authStore.currentUser?.profilePicture"
              variant="text"
              size="small"
              color="error"
              class="mt-4"
              :loading="removingPicture"
              @click="removePicture"
            >
              Remove Picture
            </v-btn>
          </v-card>
        </v-col>

        <!-- Edit Panels -->
        <v-col cols="12" md="8">
          <v-card elevation="1">
            <v-tabs v-model="tab" color="primary" show-arrows>
              <v-tab value="personal">
                <v-icon start>mdi-account-outline</v-icon>
                Personal Information
              </v-tab>
              <v-tab value="security">
                <v-icon start>mdi-lock-outline</v-icon>
                Security
              </v-tab>
              <v-tab value="notifications">
                <v-icon start>mdi-bell-outline</v-icon>
                Notifications
              </v-tab>
            </v-tabs>

            <v-divider></v-divider>

            <v-window v-model="tab">
              <!-- Personal Information -->
              <v-window-item value="personal">
                <v-card-text class="pa-6">
                  <v-form ref="profileFormRef" v-model="profileFormValid">
                    <v-row>
                      <v-col cols="12">
                        <v-text-field
                          v-model="form.fullname"
                          label="Full Name"
                          prepend-inner-icon="mdi-account"
                          variant="outlined"
                          :rules="nameRules"
                          required
                        ></v-text-field>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="form.email"
                          label="Email Address"
                          prepend-inner-icon="mdi-email-outline"
                          variant="outlined"
                          readonly
                          hint="Email addresses cannot be changed online"
                          persistent-hint
                        ></v-text-field>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="form.phone"
                          label="Phone Number"
                          prepend-inner-icon="mdi-phone-outline"
                          variant="outlined"
                          :rules="phoneRules"
                          hint="e.g. 08012345678"
                          persistent-hint
                        ></v-text-field>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="form.organisation"
                          label="Organisation / Institution"
                          prepend-inner-icon="mdi-office-building-outline"
                          variant="outlined"
                          maxlength="200"
                          hint="Optional"
                          persistent-hint
                        ></v-text-field>
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="form.jobTitle"
                          label="Job Title"
                          prepend-inner-icon="mdi-briefcase-outline"
                          variant="outlined"
                          maxlength="100"
                          hint="Optional"
                          persistent-hint
                        ></v-text-field>
                      </v-col>

                      <v-col cols="12">
                        <v-select
                          v-model="form.participantType"
                          label="Participant Type"
                          :items="participantTypes"
                          prepend-inner-icon="mdi-account-group-outline"
                          variant="outlined"
                          clearable
                        ></v-select>
                      </v-col>

                      <v-col cols="12">
                        <v-textarea
                          v-model="form.biography"
                          label="Biography"
                          prepend-inner-icon="mdi-text-box-outline"
                          variant="outlined"
                          rows="4"
                          maxlength="500"
                          counter
                          hint="A short description about you (optional)"
                          persistent-hint
                        ></v-textarea>
                      </v-col>
                    </v-row>
                  </v-form>
                </v-card-text>

                <v-divider></v-divider>

                <v-card-actions class="pa-4">
                  <v-btn variant="text" @click="resetForm" :disabled="savingProfile">
                    Reset
                  </v-btn>
                  <v-spacer></v-spacer>
                  <v-btn
                    color="accent"
                    variant="flat"
                    elevation="0"
                    :loading="savingProfile"
                    :disabled="!profileFormValid"
                    @click="saveProfile"
                  >
                    Save Changes
                  </v-btn>
                </v-card-actions>
              </v-window-item>

              <!-- Security -->
              <v-window-item value="security">
                <v-card-text class="pa-6">
                  <p class="text-body-2 text-medium-emphasis mb-6">
                    Choose a strong password with at least 8 characters, including
                    uppercase, lowercase and a number.
                  </p>

                  <v-form ref="passwordFormRef" v-model="passwordFormValid">
                    <v-text-field
                      v-model="passwordForm.currentPassword"
                      label="Current Password"
                      :type="showPasswords ? 'text' : 'password'"
                      prepend-inner-icon="mdi-lock-outline"
                      :append-inner-icon="showPasswords ? 'mdi-eye' : 'mdi-eye-off'"
                      variant="outlined"
                      :rules="requiredRules"
                      class="mb-3"
                      @click:append-inner="showPasswords = !showPasswords"
                    ></v-text-field>

                    <v-text-field
                      v-model="passwordForm.newPassword"
                      label="New Password"
                      :type="showPasswords ? 'text' : 'password'"
                      prepend-inner-icon="mdi-lock-reset"
                      :append-inner-icon="showPasswords ? 'mdi-eye' : 'mdi-eye-off'"
                      variant="outlined"
                      :rules="passwordRules"
                      class="mb-3"
                      @click:append-inner="showPasswords = !showPasswords"
                    ></v-text-field>

                    <v-text-field
                      v-model="passwordForm.confirmPassword"
                      label="Confirm New Password"
                      :type="showPasswords ? 'text' : 'password'"
                      prepend-inner-icon="mdi-lock-check-outline"
                      variant="outlined"
                      :rules="confirmPasswordRules"
                    ></v-text-field>
                  </v-form>
                </v-card-text>

                <v-divider></v-divider>

                <v-card-actions class="pa-4">
                  <v-spacer></v-spacer>
                  <v-btn
                    color="accent"
                    variant="flat"
                    elevation="0"
                    :loading="savingPassword"
                    :disabled="!passwordFormValid"
                    @click="changePassword"
                  >
                    Update Password
                  </v-btn>
                </v-card-actions>
              </v-window-item>

              <!-- Notification Preferences -->
              <v-window-item value="notifications">
                <v-card-text class="pa-6">
                  <p class="text-body-2 text-medium-emphasis mb-6">
                    Choose how CITAD should contact you about events, reminders and
                    certificates.
                  </p>

                  <div class="preference-row">
                    <div>
                      <div class="text-body-1 font-weight-medium">Email notifications</div>
                      <div class="text-caption text-medium-emphasis">
                        Registrations, reminders and certificate delivery
                      </div>
                    </div>
                    <v-switch
                      v-model="preferences.emailNotifications"
                      color="primary"
                      hide-details
                      inset
                    ></v-switch>
                  </div>

                  <v-divider class="my-4"></v-divider>

                  <div class="preference-row">
                    <div>
                      <div class="text-body-1 font-weight-medium">SMS notifications</div>
                      <div class="text-caption text-medium-emphasis">
                        Short reminders sent to your phone number
                      </div>
                    </div>
                    <v-switch
                      v-model="preferences.smsNotifications"
                      color="primary"
                      hide-details
                      inset
                    ></v-switch>
                  </div>

                  <v-divider class="my-4"></v-divider>

                  <div class="preference-row">
                    <div>
                      <div class="text-body-1 font-weight-medium">Push notifications</div>
                      <div class="text-caption text-medium-emphasis">
                        Alerts in the meetCITAD app
                      </div>
                    </div>
                    <v-switch
                      v-model="preferences.pushNotifications"
                      color="primary"
                      hide-details
                      inset
                    ></v-switch>
                  </div>
                </v-card-text>

                <v-divider></v-divider>

                <v-card-actions class="pa-4">
                  <v-spacer></v-spacer>
                  <v-btn
                    color="accent"
                    variant="flat"
                    elevation="0"
                    :loading="savingPreferences"
                    @click="savePreferences"
                  >
                    Save Preferences
                  </v-btn>
                </v-card-actions>
              </v-window-item>
            </v-window>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const authStore = useAuthStore()
const router = useRouter()
const { error } = storeToRefs(authStore)

const tab = ref('personal')
const profileFormRef = ref(null)
const passwordFormRef = ref(null)
const profileFormValid = ref(false)
const passwordFormValid = ref(false)
const fileInput = ref(null)
const uploading = ref(false)
const removingPicture = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)
const savingPreferences = ref(false)
const showPasswords = ref(false)

const form = reactive({
  fullname: '',
  email: '',
  phone: '',
  organisation: '',
  jobTitle: '',
  participantType: '',
  biography: '',
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const preferences = reactive({
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
})

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success',
})

const participantTypes = [
  'Student',
  'Researcher',
  'Civil Society Organization',
  'Government Official',
  'Business Professional',
  'Journalist/Media',
  'Community Leader',
  'Tech Professional',
  'Academic/Faculty',
  'Development Practitioner',
  'General Public',
  'Other',
]

const nameRules = [
  (value) => Boolean(value) || 'Full name is required',
  (value) => (value || '').trim().length >= 2 || 'Name must be at least 2 characters',
]

const phoneRules = [
  (value) =>
    !value || /^\+?[\d\s-()]{7,20}$/.test(value) || 'Enter a valid phone number',
]

const requiredRules = [(value) => Boolean(value) || 'This field is required']

const passwordRules = [
  (value) => Boolean(value) || 'Password is required',
  (value) => (value || '').length >= 8 || 'Password must be at least 8 characters',
  (value) => /[A-Z]/.test(value) || 'Include at least one uppercase letter',
  (value) => /[a-z]/.test(value) || 'Include at least one lowercase letter',
  (value) => /[0-9]/.test(value) || 'Include at least one number',
  (value) => /[^A-Za-z0-9]/.test(value) || 'Include at least one special character',
  (value) =>
    value !== passwordForm.currentPassword ||
    'The new password must be different from the current one',
]

const confirmPasswordRules = [
  (value) => Boolean(value) || 'Please confirm your password',
  (value) =>
    value === passwordForm.newPassword || 'Passwords do not match',
]

const populateForm = () => {
  const user = authStore.currentUser
  if (!user) return

  form.fullname = user.fullname || ''
  form.email = user.email || ''
  form.phone = user.phone || ''
  form.organisation = user.organisation || ''
  form.jobTitle = user.jobTitle || ''
  form.participantType = user.participantType || ''
  form.biography = user.biography || ''

  preferences.emailNotifications = user.preferences?.emailNotifications ?? true
  preferences.smsNotifications = user.preferences?.smsNotifications ?? false
  preferences.pushNotifications = user.preferences?.pushNotifications ?? true
}

watch(() => authStore.currentUser, populateForm, { immediate: true })

const showSnackbar = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

const saveProfile = async () => {
  const { valid } = await profileFormRef.value.validate()
  if (!valid) return

  savingProfile.value = true
  try {
    await authStore.updateProfile({
      fullname: form.fullname,
      phone: form.phone,
      organisation: form.organisation,
      jobTitle: form.jobTitle,
      participantType: form.participantType,
      biography: form.biography,
    })
    populateForm()
    showSnackbar('Your profile has been updated.')
  } catch (err) {
    showSnackbar(
      err.response?.data?.message || 'Could not update your profile.',
      'error'
    )
  } finally {
    savingProfile.value = false
  }
}

const resetForm = () => {
  populateForm()
  profileFormRef.value?.resetValidation()
}

const changePassword = async () => {
  const { valid } = await passwordFormRef.value.validate()
  if (!valid) return

  savingPassword.value = true
  try {
    await authStore.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword,
    })
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    passwordFormRef.value?.resetValidation()
    showSnackbar('Password changed. Please sign in again.')
    router.replace({ path: '/login', query: { reason: 'password-changed' } })
  } catch (err) {
    showSnackbar(
      err.response?.data?.message || 'Could not change your password.',
      'error'
    )
  } finally {
    savingPassword.value = false
  }
}

const savePreferences = async () => {
  savingPreferences.value = true
  try {
    await authStore.updatePreferences({ ...preferences })
    showSnackbar('Notification preferences saved.')
  } catch (err) {
    showSnackbar(
      err.response?.data?.message || 'Could not save your preferences.',
      'error'
    )
  } finally {
    savingPreferences.value = false
  }
}

const triggerFilePicker = () => fileInput.value?.click()

const handleFileSelected = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showSnackbar('Please choose an image file.', 'error')
    event.target.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    showSnackbar('The image must be smaller than 5 MB.', 'error')
    event.target.value = ''
    return
  }

  uploading.value = true
  try {
    await authStore.uploadProfilePicture(file)
    showSnackbar('Profile picture updated.')
  } catch (err) {
    showSnackbar(
      err.response?.data?.message || 'Could not upload the picture.',
      'error'
    )
  } finally {
    uploading.value = false
    event.target.value = ''
  }
}

const removePicture = async () => {
  removingPicture.value = true
  try {
    await api.user.deleteProfilePicture()
    await authStore.fetchProfile()
    showSnackbar('Profile picture removed.')
  } catch (err) {
    showSnackbar(
      err.response?.data?.message || 'Could not remove the picture.',
      'error'
    )
  } finally {
    removingPicture.value = false
  }
}

onMounted(async () => {
  if (!authStore.currentUser) {
    await authStore.fetchProfile()
  }
})
</script>

<style scoped>
.profile-page {
  min-height: calc(100vh - 64px - 300px);
}

.summary-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.avatar-wrapper {
  position: relative;
  width: 120px;
}

.avatar-edit {
  position: absolute;
  right: 0;
  bottom: 0;
  border: 2px solid rgb(var(--v-theme-surface));
}

.preference-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.v-theme--dark .summary-card {
  border-color: rgba(255, 255, 255, 0.08);
}
</style>
