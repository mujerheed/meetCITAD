// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    }
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#0F2A44',       // Deep Institutional Blue (brand guideline)
          secondary: '#374151',     // Dark Gray (brand guideline)
          accent: '#C9A44C',        // Muted Gold (restrained use)
          error: '#DC2626',         
          info: '#0F2A44',          
          success: '#059669',       
          warning: '#D97706',       
          background: '#FFFFFF',    // White or off-white approved
          surface: '#FFFFFF',
        },
      },
      dark: {
        colors: {
          primary: '#0F2A44',       // Deep Institutional Blue maintained
          secondary: '#374151',     // Dark Gray
          accent: '#C9A44C',        // Muted Gold (sparingly)
          error: '#DC2626',
          info: '#0F2A44',
          success: '#059669',
          warning: '#D97706',
          background: '#1A1D23',    // Very dark neutral (approved)
          surface: '#2A2E35',       // Slightly lighter for cards
        },
      },
    },
  },
})

export default vuetify
