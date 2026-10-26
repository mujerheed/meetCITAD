import { fileURLToPath, URL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

function serviceWorkerPrecache() {
  return {
    name: 'meetcitad-service-worker-precache',
    apply: 'build',
    async writeBundle(options, bundle) {
      const template = await readFile(new URL('./public/sw.js', import.meta.url), 'utf8')
      const assets = Object.keys(bundle)
        .filter((filename) => filename.startsWith('assets/'))
        .sort()
        .map((filename) => `/${filename}`)
      const version = createHash('sha256')
        .update(template)
        .update(JSON.stringify(assets))
        .update(String(bundle['index.html']?.source || ''))
        .digest('hex')
        .slice(0, 12)
      const worker = template
        .replace("const CACHE_VERSION = 'meetcitad-v2';", `const CACHE_VERSION = 'meetcitad-v2-${version}';`)
        .replace('const BUILD_ASSETS = [];', `const BUILD_ASSETS = ${JSON.stringify(assets)};`)

      await writeFile(resolve(options.dir, 'sw.js'), worker)
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
      serviceWorkerPrecache()
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 5173,
      proxy: {
        // The v2 API is mounted at /api/v1 on the backend (PORT=4000).
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true
        }
      }
    }
  }
})
