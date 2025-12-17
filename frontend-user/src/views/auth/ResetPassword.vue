<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="pa-4">
          <v-card-title class="text-h4 text-center mb-4">
            Reset Password
          </v-card-title>
          
          <v-card-text>
            <v-form ref="formRef" v-model="valid" @submit.prevent="handleSubmit">
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
                color="primary"
                block
                size="large"
                :loading="loading"
                :disabled="!valid"
                class="mb-3"
              >
                Reset Password
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref(null)
const valid = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const form = ref({
  password: '',
  confirmPassword: '',
})

const loading = computed(() => authStore.loading)
const error = computed(() => authStore.error)

const passwordRules = [
  v => !!v || 'Password is required',
  v => v.length >= 6 || 'Password must be at least 6 characters',
]

const confirmPasswordRules = [
  v => !!v || 'Please confirm your password',
  v => v === form.value.password || 'Passwords do not match',
]

const handleSubmit = async () => {
  if (!valid.value) return
  
  try {
    const token = route.params.token
    await authStore.resetPassword(token, form.value.password)
    
    // Redirect to login
    router.push('/login')
  } catch (error) {
    console.error('Password reset failed:', error)
  }
}
</script>
