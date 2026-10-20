<template>
  <v-container class="verify-page fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="9" md="7" lg="5">
        <v-card class="pa-2" elevation="1">
          <v-card-text class="pa-6">
            <div class="text-center mb-6">
              <v-icon size="48" color="primary" class="mb-3">
                mdi-email-check-outline
              </v-icon>
              <h1 class="text-h5 font-weight-bold mb-2">Verify your email</h1>
              <p class="text-body-2 text-medium-emphasis">
                We sent a 6-digit verification code to
                <strong>{{ email || 'your email address' }}</strong>.
                Enter it below to activate your account.
              </p>
            </div>

            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
              @click:close="authStore.clearError()"
            >
              {{ error }}
            </v-alert>

            <v-alert
              v-if="infoMessage"
              type="success"
              variant="tonal"
              class="mb-4"
            >
              {{ infoMessage }}
            </v-alert>

            <v-alert v-if="!email" type="warning" variant="tonal" class="mb-4">
              We could not find the email address for this verification. Please
              sign up again or log in.
            </v-alert>

            <v-form ref="formRef" @submit.prevent="submit">
              <v-text-field
                v-model="otp"
                label="Verification code"
                placeholder="000000"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                variant="outlined"
                class="otp-field mb-4"
                :rules="otpRules"
                :disabled="!email"
                autofocus
                @update:model-value="onOtpInput"
              ></v-text-field>

              <v-btn
                type="submit"
                color="accent"
                variant="flat"
                elevation="0"
                size="large"
                block
                class="mb-3"
                :loading="loading"
                :disabled="!email || otp.length !== 6"
              >
                Verify Email
              </v-btn>
            </v-form>

            <div class="text-center">
              <p class="text-body-2 text-medium-emphasis mb-2">
                Didn't receive the code?
              </p>
              <v-btn
                variant="text"
                color="primary"
                size="small"
                :disabled="resendCountdown > 0 || !email"
                :loading="resending"
                @click="resend"
              >
                {{
                  resendCountdown > 0
                    ? `Resend in ${resendCountdown}s`
                    : 'Resend code'
                }}
              </v-btn>
            </div>

            <v-divider class="my-4"></v-divider>

            <div class="text-center">
              <router-link to="/login" class="text-decoration-none text-body-2">
                Back to Sign In
              </router-link>
              <span class="mx-2 text-medium-emphasis">|</span>
              <router-link to="/signup" class="text-decoration-none text-body-2">
                Use a different email
              </router-link>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const { loading, error } = storeToRefs(authStore)

const email = computed(
  () =>
    route.query.email ||
    authStore.pendingEmail ||
    localStorage.getItem('pendingEmail') ||
    ''
)

const otp = ref('')
const formRef = ref(null)
const resending = ref(false)
const infoMessage = ref('')
const resendCountdown = ref(0)
let countdownTimer = null

const otpRules = [
  (value) => Boolean(value) || 'Enter the code from your email',
  (value) => /^\d{6}$/.test(value) || 'The code must be 6 digits',
]

const onOtpInput = (value) => {
  otp.value = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 6)
}

const startCountdown = () => {
  resendCountdown.value = 60
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    resendCountdown.value -= 1
    if (resendCountdown.value <= 0) {
      clearInterval(countdownTimer)
    }
  }, 1000)
}

const submit = async () => {
  if (otp.value.length !== 6 || !email.value) return

  try {
    await authStore.verifyOtp(email.value, otp.value)
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } catch {
    // Error is displayed from the store.
  }
}

const resend = async () => {
  if (resendCountdown.value > 0 || !email.value) return

  resending.value = true
  infoMessage.value = ''

  try {
    await authStore.resendOtp(email.value)
    infoMessage.value = 'A new verification code has been sent to your email.'
    startCountdown()
  } catch {
    // Error is displayed from the store.
  } finally {
    resending.value = false
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.replace('/dashboard')
  }
})

onBeforeUnmount(() => {
  clearInterval(countdownTimer)
})
</script>

<style scoped>
.verify-page {
  min-height: calc(100vh - 64px - 300px);
}

.otp-field :deep(input) {
  text-align: center;
  font-size: 1.5rem;
  letter-spacing: 0.5em;
  font-weight: 600;
}
</style>
