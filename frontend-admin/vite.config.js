import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{js,vue}'],
    include: [
      'vuetify',
      'vuetify/directives',
      'vuetify/iconsets/mdi',
      'vuetify/components/VAlert',
      'vuetify/components/VApp',
      'vuetify/components/VAppBar',
      'vuetify/components/VAppBarNavIcon',
      'vuetify/components/VAutocomplete',
      'vuetify/components/VAvatar',
      'vuetify/components/VBtn',
      'vuetify/components/VCard',
      'vuetify/components/VCardActions',
      'vuetify/components/VCardText',
      'vuetify/components/VCardTitle',
      'vuetify/components/VCheckbox',
      'vuetify/components/VCheckboxBtn',
      'vuetify/components/VChip',
      'vuetify/components/VCol',
      'vuetify/components/VDialog',
      'vuetify/components/VDivider',
      'vuetify/components/VFileInput',
      'vuetify/components/VForm',
      'vuetify/components/VGrid',
      'vuetify/components/VIcon',
      'vuetify/components/VImg',
      'vuetify/components/VList',
      'vuetify/components/VListItem',
      'vuetify/components/VMain',
      'vuetify/components/VMenu',
      'vuetify/components/VNavigationDrawer',
      'vuetify/components/VPagination',
      'vuetify/components/VProgressCircular',
      'vuetify/components/VProgressLinear',
      'vuetify/components/VRadio',
      'vuetify/components/VRadioGroup',
      'vuetify/components/VRating',
      'vuetify/components/VRow',
      'vuetify/components/VSelect',
      'vuetify/components/VSkeletonLoader',
      'vuetify/components/VSnackbar',
      'vuetify/components/VSpacer',
      'vuetify/components/VSwitch',
      'vuetify/components/VTab',
      'vuetify/components/VTable',
      'vuetify/components/VTabs',
      'vuetify/components/VTextarea',
      'vuetify/components/VTextField',
      'vuetify/components/VWindow',
      'vuetify/components/VWindowItem',
    ],
  },
})
