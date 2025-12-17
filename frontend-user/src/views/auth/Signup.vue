<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="10" md="8" lg="6">
        <v-card class="pa-4">
          <v-card-title class="text-h4 text-center mb-4">
            Sign Up
          </v-card-title>
          
          <v-card-text>
            <v-form ref="formRef" v-model="valid" @submit.prevent="handleSubmit">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.firstName"
                    label="First Name"
                    prepend-inner-icon="mdi-account"
                    :rules="nameRules"
                    required
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.lastName"
                    label="Last Name"
                    prepend-inner-icon="mdi-account"
                    :rules="nameRules"
                    required
                    variant="outlined"
                  ></v-text-field>
                </v-col>
              </v-row>
              
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
              
              <v-text-field
                v-model="form.phone"
                label="Phone Number"
                type="tel"
                prepend-inner-icon="mdi-phone"
                :rules="phoneRules"
                variant="outlined"
                class="mb-3"
              ></v-text-field>
              
              <v-select
                v-model="form.department"
                label="Department"
                :items="departments"
                prepend-inner-icon="mdi-office-building"
                :rules="requiredRules"
                required
                variant="outlined"
                class="mb-3"
              ></v-select>
              
              <v-text-field
                v-model="form.studentId"
                label="Student ID"
                prepend-inner-icon="mdi-badge-account"
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
                Sign Up
              </v-btn>
              
              <v-row class="mt-2">
                <v-col cols="12" class="text-center">
                  Already have an account?
                  <router-link to="/login" class="text-decoration-none">
                    Login
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
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref(null)
const valid = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  department: '',
  studentId: '',
})

const departments = [
  'Computer Science',
  'Information Technology',
  'Software Engineering',
  'Artificial Intelligence',
  'Cyber Security',
  'Data Science',
  'Business Administration',
  'Other'
]

const loading = computed(() => authStore.loading)
const error = computed(() => authStore.error)

const nameRules = [
  v => !!v || 'Name is required',
  v => v.length >= 2 || 'Name must be at least 2 characters',
]

const emailRules = [
  v => !!v || 'Email is required',
  v => /.+@.+\..+/.test(v) || 'Email must be valid',
]

const passwordRules = [
  v => !!v || 'Password is required',
  v => v.length >= 6 || 'Password must be at least 6 characters',
  v => /[A-Z]/.test(v) || 'Password must contain at least one uppercase letter',
  v => /[a-z]/.test(v) || 'Password must contain at least one lowercase letter',
  v => /[0-9]/.test(v) || 'Password must contain at least one number',
]

const confirmPasswordRules = [
  v => !!v || 'Please confirm your password',
  v => v === form.value.password || 'Passwords do not match',
]

const phoneRules = [
  v => !v || /^\+?[\d\s-()]+$/.test(v) || 'Phone number must be valid',
]

const requiredRules = [
  v => !!v || 'This field is required',
]

const handleSubmit = async () => {
  if (!valid.value) return
  
  try {
    const { confirmPassword, ...userData } = form.value
    await authStore.signup(userData)
    
    // Redirect to dashboard
    router.push('/dashboard')
  } catch (error) {
    // Error is handled in the store
    console.error('Signup failed:', error)
  }
}
</script>
