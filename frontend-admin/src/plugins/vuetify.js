// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

const storedTheme =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem('admin_theme') || 'light'
    : 'light'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: storedTheme === 'dark' ? 'dark' : 'light',
    themes: {
      light: {
        colors: {
          primary: '#0F2A44',
          secondary: '#374151',
          accent: '#C9A44C',
          error: '#DC2626',
          info: '#0F2A44',
          success: '#059669',
          warning: '#D97706',
          background: '#F7F8FA',
          surface: '#FFFFFF',
          'surface-variant': '#F1F3F6',
        },
      },
      dark: {
        colors: {
          primary: '#0F2A44',
          secondary: '#374151',
          accent: '#C9A44C',
          error: '#DC2626',
          info: '#0F2A44',
          success: '#059669',
          warning: '#D97706',
          background: '#1A1D23',
          surface: '#2A2E35',
          'surface-variant': '#333842',
        },
      },
    },
  },
})

export default vuetify
