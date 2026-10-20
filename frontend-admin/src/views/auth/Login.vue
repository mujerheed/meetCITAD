<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="login-panel-inner">
        <div class="d-flex align-center ga-3 mb-10">
          <img :src="logoWhite" alt="meetCITAD" class="panel-logo" />
          <div>
            <div class="panel-brand">meetCITAD</div>
            <div class="panel-brand-sub">Administration Portal</div>
          </div>
        </div>

        <div class="panel-kicker">Centre for Information Technology and Development</div>
        <h1 class="panel-title">
          Manage CITAD programs with clarity and control.
        </h1>
        <p class="panel-copy">
          Publish events, manage registrations, scan attendance, issue
          certificates, and review participant feedback from one institutional
          workspace.
        </p>

        <div class="panel-points">
          <div v-for="point in points" :key="point.title" class="panel-point">
            <v-icon size="18" color="#C9A44C">{{ point.icon }}</v-icon>
            <div>
              <div class="point-title">{{ point.title }}</div>
              <div class="point-copy">{{ point.copy }}</div>
            </div>
          </div>
        </div>

        <div class="panel-footer">
          <img :src="citadLogo" alt="CITAD" class="citad-logo" />
          <span>Authorized CITAD staff only</span>
        </div>
      </div>
    </div>

    <div class="login-form-side">
      <div class="login-form-wrap">
        <div class="mobile-brand d-flex align-center ga-3 mb-8">
          <img :src="logoSymbol" alt="meetCITAD" class="mobile-logo" />
          <div>
            <div class="panel-brand text-primary">meetCITAD</div>
            <div class="panel-brand-sub text-medium-emphasis">Administration</div>
          </div>
        </div>

        <div class="text-overline text-medium-emphasis mb-1">Secure sign in</div>
        <h2 class="login-title mb-1">Administrator access</h2>
        <p class="login-subtitle mb-7">
          Use your CITAD email address and password. Two-factor authentication
          is required when enabled on your account.
        </p>

        <v-alert
          v-if="route.query.reason === 'password-changed'"
          type="success"
          variant="tonal"
          density="comfortable"
          class="mb-5"
          icon="mdi-shield-check-outline"
        >
          Your password was updated and all previous sessions were signed out.
          Please sign in with your new password.
        </v-alert>

        <v-alert
          v-if="auth.error"
          type="error"
          variant="tonal"
          density="comfortable"
          class="mb-5"
          closable
          @click:close="auth.clearError()"
        >
          {{ auth.error }}
        </v-alert>

        <v-form ref="formRef" @submit.prevent="submit">
          <v-text-field
            v-model="form.email"
            label="CITAD email"
            placeholder="name@citad.org"
            variant="outlined"
            prepend-inner-icon="mdi-email-outline"
            autocomplete="username"
            :rules="emailRules"
            class="mb-3"
          ></v-text-field>

          <v-text-field
            v-model="form.password"
            label="Password"
            variant="outlined"
            prepend-inner-icon="mdi-lock-outline"
            :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            :rules="passwordRules"
            class="mb-3"
            @click:append-inner="showPassword = !showPassword"
          ></v-text-field>

          <v-text-field
            v-if="showTwoFactor"
            v-model="form.twoFactorCode"
            label="Two-factor code"
            placeholder="6-digit code"
            variant="outlined"
            prepend-inner-icon="mdi-shield-key-outline"
            inputmode="numeric"
            maxlength="6"
            autocomplete="one-time-code"
            :rules="twoFactorRules"
            class="mb-3"
            hint="Enter the code from your authenticator app."
            persistent-hint
          ></v-text-field>

          <div v-if="!showTwoFactor" class="d-flex justify-end mb-4">
            <v-btn
              variant="text"
              size="small"
              color="primary"
              @click="showTwoFactor = true"
            >
              I have a two-factor code
            </v-btn>
          </div>

          <v-btn
            type="submit"
            color="accent"
            variant="flat"
            block
            size="large"
            elevation="0"
            :loading="auth.loading"
            class="login-button"
          >
            Sign in to administration
          </v-btn>
        </v-form>

        <div class="security-note mt-8">
          <v-icon size="16" color="success">mdi-shield-check-outline</v-icon>
          <span>
            This portal is monitored. Sign-in attempts and administrative
            actions are recorded in the audit log.
          </span>
        </div>

        <div class="text-caption text-medium-emphasis text-center mt-6">
          © {{ new Date().getFullYear() }} CITAD. meetCITAD v2.0
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import logoSymbol from '@/assets/images/logo-symbol.png'
import logoWhite from '@/assets/images/logo-white.png'
import citadLogo from '@/assets/images/citad-logo.png'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const formRef = ref(null)
const showPassword = ref(false)
const showTwoFactor = ref(false)

const form = reactive({
  email: '',
  password: '',
  twoFactorCode: '',
})

const emailRules = [
  (value) => Boolean(value) || 'Email is required',
  (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '') || 'Enter a valid email address',
  (value) =>
    /@citad\.(org|edu\.ng)$/i.test(value || '') ||
    'Only CITAD email addresses are allowed',
]

const passwordRules = [(value) => Boolean(value) || 'Password is required']

const twoFactorRules = [
  (value) =>
    !showTwoFactor.value ||
    /^\d{6}$/.test(value || '') ||
    'Enter the 6-digit code',
]

const points = [
  {
    icon: 'mdi-calendar-check-outline',
    title: 'Event operations',
    copy: 'Create, publish, and monitor CITAD programs.',
  },
  {
    icon: 'mdi-qrcode-scan',
    title: 'Attendance control',
    copy: 'Scan participant tickets and reconcile check-ins.',
  },
  {
    icon: 'mdi-chart-line',
    title: 'Evidence and reporting',
    copy: 'Certificates, feedback, and exportable records.',
  },
]

const submit = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    await auth.login({
      email: form.email.trim(),
      password: form.password,
      twoFactorCode: form.twoFactorCode || undefined,
      otp: form.twoFactorCode || undefined,
    })

    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : '/'

    router.replace(redirect)
  } catch (error) {
    const message = auth.error || ''
    if (/two-factor|2fa|otp/i.test(message)) {
      showTwoFactor.value = true
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  background: rgb(var(--v-theme-surface));
}

.login-panel {
  background: #0f2a44;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px;
  position: relative;
}

.login-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('@/assets/images/logo-symbol.png');
  background-repeat: no-repeat;
  background-position: right -80px bottom -60px;
  background-size: 420px;
  opacity: 0.04;
  pointer-events: none;
}

.login-panel-inner {
  position: relative;
  z-index: 1;
  max-width: 520px;
  width: 100%;
}

.panel-logo {
  height: 42px;
  width: auto;
  object-fit: contain;
}

.panel-brand {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #ffffff;
}

.panel-brand-sub {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.65;
}

.panel-kicker {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c9a44c;
  margin-bottom: 14px;
}

.panel-title {
  font-size: clamp(1.7rem, 2.4vw, 2.35rem);
  line-height: 1.22;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #ffffff;
  margin-bottom: 18px;
}

.panel-copy {
  font-size: 0.94rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.72);
  max-width: 460px;
}

.panel-points {
  margin-top: 38px;
  display: grid;
  gap: 20px;
}

.panel-point {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.point-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffffff;
}

.point-copy {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
}

.panel-footer {
  margin-top: 48px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.55);
}

.citad-logo {
  height: 34px;
  width: auto;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.9;
}

.login-form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  background: rgb(var(--v-theme-surface));
}

.login-form-wrap {
  width: 100%;
  max-width: 420px;
}

.login-title {
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-primary));
}

.v-theme--dark .login-title {
  color: #f9fafb;
}

.login-subtitle {
  font-size: 0.86rem;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.64);
  max-width: 380px;
}

.login-button {
  height: 48px !important;
  font-weight: 600 !important;
}

.security-note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 0.74rem;
  line-height: 1.55;
  color: rgba(var(--v-theme-on-surface), 0.58);
  background: rgba(15, 42, 68, 0.04);
  border: 1px solid rgba(15, 42, 68, 0.08);
  padding: 12px 14px;
  border-radius: 4px;
}

.v-theme--dark .security-note {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
}

.mobile-brand {
  display: none;
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-panel {
    display: none;
  }

  .mobile-brand {
    display: flex;
  }

  .mobile-logo {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }

  .login-form-side {
    min-height: 100vh;
    padding: 32px 22px;
  }
}
</style>
