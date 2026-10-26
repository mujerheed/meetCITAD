<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="login-panel-inner">
        <div class="d-flex align-center ga-3 mb-10">
          <img :src="logoMark" alt="meetCITAD" class="panel-logo" />
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
        <div class="mobile-brand align-center ga-3 mb-8">
          <img :src="mobileLogo" alt="meetCITAD" class="mobile-logo" />
          <div>
            <div class="panel-brand text-primary">meetCITAD</div>
            <div class="panel-brand-sub text-medium-emphasis">Administration</div>
          </div>
        </div>

        <div class="text-overline text-medium-emphasis mb-1">Secure sign in</div>
        <h2 class="login-title mb-1">Administrator access</h2>
        <p class="login-subtitle mb-7">
          Use your CITAD email address and password. Two-factor authentication
          is enforced for super administrators and required when enabled on
          your account.
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

        <div v-if="setup.active" class="setup-card mb-5">
          <div class="text-overline text-medium-emphasis mb-1">
            Super administrator enrollment
          </div>
          <h3 class="setup-title mb-2">Protect your account with 2FA</h3>

          <template v-if="!setup.recoveryCodes.length">
            <p class="setup-copy mb-4">
              Scan this QR code with an authenticator app such as Google
              Authenticator or Microsoft Authenticator, then enter the
              6-digit code to finish signing in.
            </p>

            <div class="setup-qr-wrap mb-4">
              <img
                v-if="setup.qrCode"
                :src="setup.qrCode"
                alt="Two-factor authentication QR code"
                class="setup-qr"
              />
            </div>

            <v-text-field
              :model-value="setup.secret"
              label="Manual setup key"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-key-outline"
              readonly
              class="mb-3 setup-secret"
            ></v-text-field>

            <v-text-field
              v-model="setup.code"
              label="6-digit authenticator code"
              placeholder="000000"
              variant="outlined"
              prepend-inner-icon="mdi-shield-key-outline"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              class="mb-2"
              @keyup.enter="confirmSetup"
            ></v-text-field>

            <div v-if="setupError" class="text-error text-caption mb-3">
              {{ setupError }}
            </div>

            <v-btn
              color="accent"
              variant="flat"
              block
              size="large"
              elevation="0"
              :loading="auth.loading"
              class="login-button mb-2"
              @click="confirmSetup"
            >
              Enable 2FA and sign in
            </v-btn>
            <v-btn
              variant="text"
              block
              color="primary"
              :disabled="auth.loading"
              @click="cancelSetup"
            >
              Back to sign in
            </v-btn>
          </template>

          <template v-else>
            <v-alert
              type="warning"
              variant="tonal"
              density="comfortable"
              class="mb-4"
              icon="mdi-content-save-alert-outline"
            >
              Store these recovery codes somewhere safe. Each code can be used
              once if you lose access to your authenticator app.
            </v-alert>

            <div class="recovery-grid mb-4">
              <code v-for="recoveryCode in setup.recoveryCodes" :key="recoveryCode">
                {{ recoveryCode }}
              </code>
            </div>

            <v-btn
              color="accent"
              variant="flat"
              block
              size="large"
              elevation="0"
              class="login-button"
              @click="finishSetup"
            >
              Continue to dashboard
            </v-btn>
          </template>
        </div>

        <v-form v-if="!setup.active" ref="formRef" @submit.prevent="submit">
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
            label="Authenticator or recovery code"
            placeholder="6-digit or 16-character code"
            variant="outlined"
            prepend-inner-icon="mdi-shield-key-outline"
            inputmode="text"
            maxlength="20"
            autocomplete="one-time-code"
            :rules="twoFactorRules"
            class="mb-3"
            hint="Enter the code from your authenticator app, or a saved recovery code."
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
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import logoSymbol from '@/assets/images/logo-symbol-transparent.png'
import logoMark from '@/assets/images/logo-symbol-light.png'
import citadLogo from '@/assets/images/citad-logo-transparent.png'

const route = useRoute()
const router = useRouter()
const theme = useTheme()
const auth = useAuthStore()

const mobileLogo = computed(() =>
  theme.global.name.value === 'dark' ? logoMark : logoSymbol
)

const formRef = ref(null)
const showPassword = ref(false)
const showTwoFactor = ref(false)
const setupError = ref('')

const form = reactive({
  email: '',
  password: '',
  twoFactorCode: '',
})

const setup = reactive({
  active: false,
  token: '',
  qrCode: '',
  secret: '',
  code: '',
  recoveryCodes: [],
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
    /^[A-Za-z0-9]{16}$/.test(value || '') ||
    'Enter a 6-digit code or a 16-character recovery code',
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

const redirectAfterLogin = () => {
  const redirect =
    typeof route.query.redirect === 'string' &&
    route.query.redirect.startsWith('/') &&
    !route.query.redirect.startsWith('//')
      ? route.query.redirect
      : '/'

  router.replace(redirect)
}

const startSetup = async (setupToken) => {
  setupError.value = ''
  setup.active = true
  setup.token = setupToken
  setup.qrCode = ''
  setup.secret = ''
  setup.code = ''
  setup.recoveryCodes = []
  showTwoFactor.value = false

  try {
    const result = await auth.beginTwoFactorSetup(setupToken)
    setup.qrCode = result?.qrCode || ''
    setup.secret = result?.secret || ''
    if (!setup.qrCode || !setup.secret) {
      setupError.value = 'Could not load the two-factor setup details. Please try again.'
    }
  } catch {
    // The store exposes the API error in auth.error.
  }
}

const confirmSetup = async () => {
  setupError.value = ''
  if (!/^\d{6}$/.test(setup.code || '')) {
    setupError.value = 'Enter the 6-digit code from your authenticator app.'
    return
  }

  try {
    const result = await auth.completeTwoFactorSetup(setup.token, setup.code)
    const recoveryCodes = result?.recoveryCodes || []

    if (recoveryCodes.length) {
      setup.recoveryCodes = recoveryCodes
      setup.code = ''
    } else {
      redirectAfterLogin()
    }
  } catch {
    // The store exposes the API error in auth.error.
  }
}

const finishSetup = () => {
  redirectAfterLogin()
}

const cancelSetup = () => {
  setup.active = false
  setup.token = ''
  setup.qrCode = ''
  setup.secret = ''
  setup.code = ''
  setup.recoveryCodes = []
  setupError.value = ''
  showTwoFactor.value = false
  auth.clearError()
}

const submit = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    const result = await auth.login({
      email: form.email.trim(),
      password: form.password,
      twoFactorCode: form.twoFactorCode || undefined,
      otp: form.twoFactorCode || undefined,
    })

    if (result?.requiresTwoFactorSetup && result?.setupToken) {
      await startSetup(result.setupToken)
      return
    }

    redirectAfterLogin()
  } catch {
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
  background-image: url('@/assets/images/logo-symbol-light.png');
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

.setup-card {
  border: 1px solid rgba(15, 42, 68, 0.12);
  border-radius: 8px;
  background: rgba(15, 42, 68, 0.025);
  padding: 20px;
}

.v-theme--dark .setup-card {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
}

.setup-title {
  font-size: 1.08rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-primary));
}

.v-theme--dark .setup-title {
  color: #f9fafb;
}

.setup-copy {
  font-size: 0.82rem;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.64);
}

.setup-qr-wrap {
  display: flex;
  justify-content: center;
  padding: 12px;
  border: 1px solid rgba(15, 42, 68, 0.1);
  border-radius: 8px;
  background: #ffffff;
}

.setup-qr {
  width: 180px;
  height: 180px;
  object-fit: contain;
}

.setup-secret :deep(input) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
}

.recovery-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.recovery-grid code {
  padding: 8px;
  border: 1px solid rgba(15, 42, 68, 0.12);
  border-radius: 4px;
  text-align: center;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  background: rgba(255, 255, 255, 0.7);
}

.v-theme--dark .recovery-grid code {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
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
  align-items: center;
  gap: 12px;
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

  .recovery-grid {
    grid-template-columns: 1fr;
  }
}
</style>
