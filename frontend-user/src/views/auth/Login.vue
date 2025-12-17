<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="pa-4">
          <v-card-title class="text-h4 text-center mb-4">
            Login
          </v-card-title>
          
          <v-card-text>
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
              
              <v-text-field
                v-model="form.password"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showPassword = !showPassword"
                :rules="passwordRules"
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
                Login
              </v-btn>
              
              <v-row class="mt-2">
                <v-col cols="12" class="text-center">
                  <router-link to="/forgot-password" class="text-decoration-none">
                    Forgot Password?
                  </router-link>
                </v-col>
                <v-col cols="12" class="text-center">
                  Don't have an account?
                  <router-link to="/signup" class="text-decoration-none">
                    Sign Up
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
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref(null)
const valid = ref(false)
const showPassword = ref(false)

const form = ref({
  email: '',
  password: '',
})

const loading = computed(() => authStore.loading)
const error = computed(() => authStore.error)

const emailRules = [
  v => !!v || 'Email is required',
  v => /.+@.+\..+/.test(v) || 'Email must be valid',
]

const passwordRules = [
  v => !!v || 'Password is required',
  v => v.length >= 6 || 'Password must be at least 6 characters',
]

const handleSubmit = async () => {
  if (!valid.value) return
  
  try {
    await authStore.login(form.value)
    
    // Redirect to the page they were trying to access or dashboard
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } catch (error) {
    // Error is handled in the store
    console.error('Login failed:', error)
  }
}
</script>
