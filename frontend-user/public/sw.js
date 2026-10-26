/**
 * meetCITAD service worker
 *
 * Strategy:
 *  - API requests and private uploads are never cached.
 *  - Navigations are network-first with an offline app-shell fallback.
 *  - Each build precaches its public static assets for first-install offline use.
 */

const CACHE_PREFIX = 'meetcitad-v2';
const CACHE_VERSION = 'meetcitad-v2';
// Replaced with the emitted asset list by the Vite production build.
const BUILD_ASSETS = [];
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-180x180.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];
const STATIC_ASSETS = new Set([
  ...BUILD_ASSETS,
  ...APP_SHELL.filter((path) => path !== '/' && path !== '/index.html'),
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll([...APP_SHELL, ...BUILD_ASSETS]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.headers.has('Authorization')) return;

  // Live API data must never be served from the cache.
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

  // SPA navigations: network first, fall back to the app shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        try {
          const response = await fetch(request);
          if (response.ok && response.headers.get('Content-Type')?.includes('text/html')) {
            await cache.put('/index.html', response.clone()).catch(() => {});
          }
          return response;
        } catch {
          return (
            (await cache.match('/index.html')) ||
            (await cache.match('/')) ||
            new Response('You are offline. Connect to load meetCITAD.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })()
    );
    return;
  }

  // Only known public app assets belong in a shared cache. In particular,
  // an image destination must not make a ticket, avatar or staff banner cacheable.
  if (!STATIC_ASSETS.has(url.pathname)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })()
  );
});
