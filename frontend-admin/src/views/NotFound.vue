<template>
  <div class="notfound-page">
    <div class="notfound-card">
      <img :src="logoSymbol" alt="meetCITAD" class="notfound-logo" />

      <div class="notfound-code">404</div>
      <h1 class="notfound-title">Page not found</h1>
      <p class="notfound-copy">
        The page you requested does not exist or may have been moved. Check the
        address, or return to the administration dashboard.
      </p>

      <div class="d-flex flex-wrap justify-center ga-2 mt-6">
        <v-btn color="primary" variant="flat" elevation="0" prepend-icon="mdi-view-dashboard-outline" to="/">
          Go to Dashboard
        </v-btn>
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-arrow-left" @click="goBack">
          Go Back
        </v-btn>
      </div>

      <div class="notfound-footer">
        Centre for Information Technology and Development
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import logoSymbol from '@/assets/images/logo-symbol-transparent.png'

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/')
}
</script>

<style scoped>
.notfound-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f7f8fa;
}

.notfound-card {
  background: #ffffff;
  border: 1px solid rgba(15, 42, 68, 0.1);
  box-shadow: 0 1px 2px rgba(15, 42, 68, 0.05);
  border-radius: 4px;
  max-width: 560px;
  width: 100%;
  padding: 44px 36px;
  text-align: center;
}

.notfound-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  margin-bottom: 14px;
}

.notfound-code {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #6b7280;
}

.notfound-title {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f2a44;
  margin-top: 4px;
}

.notfound-copy {
  font-size: 0.88rem;
  line-height: 1.65;
  color: #4b5563;
  max-width: 420px;
  margin: 10px auto 0;
}

.notfound-footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid rgba(15, 42, 68, 0.08);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7280;
}
</style>
