<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="pa-4" elevation="1">
          <v-card-title class="text-h5 text-center mb-2">
            Reset Password
          </v-card-title>
          <v-card-subtitle class="text-center mb-4">
            Choose a new password for your meetCITAD account.
          </v-card-subtitle>

          <v-card-text>
            <v-alert v-if="!token" type="error" variant="tonal" class="mb-4">
              This reset link is missing its token. Please request a new password
              reset email.
            </v-alert>

            <v-alert v-if="success" type="success" variant="tonal" class="mb-4">
              Your password has been reset. You can now sign in with your new
              password.
            </v-alert>

            <v-form
              v-if="!success"
              ref="formRef"
              v-model="valid"
              @submit.prevent="handleSubmit"
            >
              <v-text-field
                v-model="form.password"
                label="New Password"
                :type="showPassword ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showPassword = !showPassword"
                :rules="passwordRules"
                required
                variant="outlined"
                class="mb-3"
                hint="At least 8 characters with uppercase, lowercase and a number"
                persistent-hint
              ></v-text-field>

              <v-text-field
                v-model="form.confirmPassword"
                label="Confirm Password"
                :type="showConfirmPassword ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock-check"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
                :rules="confirmPasswordRules"
                required
                variant="outlined"
                class="mb-3"
              ></v-text-field>

              <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                class="mb-3"
                closable
                @click:close="authStore.clearError()"
              >
                {{ error }}
              </v-alert>

              <v-btn
                type="submit"
                color="accent"
                variant="flat"
                elevation="0"
                block
                size="large"
                :loading="loading"
                :disabled="!valid || !token"
                class="mb-3"
              >
                Reset Password
              </v-btn>
            </v-form>

            <v-row class="mt-2">
              <v-col cols="12" class="text-center">
                <router-link to="/login" class="text-decoration-none">
                  Back to Login
                </router-link>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const formRef = ref(null)
const valid = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const success = ref(false)

const token = computed(() => route.params.token || route.query.token || '')

const form = ref({
  password: '',
  confirmPassword: '',
})

const loading = computed(() => authStore.loading)
const error = computed(() => authStore.error)

const passwordRules = [
  (value) => Boolean(value) || 'Password is required',
  (value) => (value || '').length >= 8 || 'Password must be at least 8 characters',
  (value) => /[A-Z]/.test(value) || 'Include at least one uppercase letter',
  (value) => /[a-z]/.test(value) || 'Include at least one lowercase letter',
  (value) => /[0-9]/.test(value) || 'Include at least one number',
]

const confirmPasswordRules = [
  (value) => Boolean(value) || 'Please confirm your password',
  (value) => value === form.value.password || 'Passwords do not match',
]

const handleSubmit = async () => {
  if (!valid.value || !token.value) return

  try {
    await authStore.resetPassword(token.value, form.value.password)
    success.value = true
    window.setTimeout(() => router.push('/login'), 2500)
  } catch (error) {
    console.error('Password reset failed:', error)
  }
}
</script>
