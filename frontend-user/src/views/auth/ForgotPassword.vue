<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="pa-4">
          <v-card-title class="text-h4 text-center mb-4">
            Forgot Password
          </v-card-title>
          
          <v-card-text>
            <p class="mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <v-form ref="formRef" v-model="valid" @submit.prevent="handleSubmit">
              <v-text-field
                v-model="form.email"
                label="Email"
                type="email"
                prepend-inner-icon="mdi-email"
                :rules="emailRules"
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
              
              <v-alert
                v-if="success"
                type="success"
                variant="tonal"
                class="mb-3"
              >
                Reset link sent! Check your email.
              </v-alert>
              
              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                :loading="loading"
                :disabled="!valid || success"
                class="mb-3"
              >
                Send Reset Link
              </v-btn>
              
              <v-row class="mt-2">
                <v-col cols="12" class="text-center">
                  <router-link to="/login" class="text-decoration-none">
                    Back to Login
                  </router-link>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const formRef = ref(null)
const valid = ref(false)
const success = ref(false)

const form = ref({
  email: '',
})

const loading = computed(() => authStore.loading)
const error = computed(() => authStore.error)

const emailRules = [
  v => !!v || 'Email is required',
  v => /.+@.+\..+/.test(v) || 'Email must be valid',
]

const handleSubmit = async () => {
  if (!valid.value) return
  
  try {
    await authStore.forgotPassword(form.value.email)
    success.value = true
  } catch (error) {
    console.error('Failed to send reset link:', error)
  }
}
</script>
