<template>
  <div class="state-page">
    <v-card class="admin-card state-card" elevation="0">
      <v-card-text class="pa-8 text-center">
        <div class="state-icon">
          <v-icon size="40" color="warning">mdi-shield-lock-outline</v-icon>
        </div>

        <div class="state-code">403</div>
        <h1 class="state-title">Access denied</h1>
        <p class="state-copy">
          Your administrator account does not have permission to view this
          section. Contact a super administrator if you believe you should have
          access.
        </p>

        <div class="d-flex flex-wrap justify-center ga-2 mt-6">
          <v-btn variant="outlined" color="primary" prepend-icon="mdi-arrow-left" to="/">
            Dashboard
          </v-btn>
          <v-btn variant="text" color="primary" prepend-icon="mdi-account-circle-outline" to="/settings">
            My Settings
          </v-btn>
        </div>

        <div v-if="from" class="text-caption text-medium-emphasis mt-6">
          Requested route: <span class="mono">{{ from }}</span>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const from = computed(() => (typeof route.query.from === 'string' ? route.query.from : ''))
</script>

<style scoped>
.state-page {
  min-height: 65vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}

.state-card {
  max-width: 560px;
  width: 100%;
}

.state-icon {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: rgba(217, 119, 6, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.state-code {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--admin-muted);
}

.state-title {
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-top: 4px;
}

.state-copy {
  font-size: 0.86rem;
  line-height: 1.65;
  color: var(--admin-muted);
  max-width: 420px;
  margin: 10px auto 0;
}
</style>
