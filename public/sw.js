// Service Worker for Tyrannosocial PWA
const CACHE_NAME = 'tyrannosocial-v9';

// Only cache truly static, versioned assets — NOT the JS/CSS bundles.
// Vite already content-hashes those filenames, so the browser cache handles
// freshness automatically. Caching them here causes stale-app bugs in previews.
const PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests over http(s)
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // ── Never intercept in preview/iframe environments ──────────────────────────
  // The Shakespeare preview runs on a *.iframe.diy subdomain. Let all requests
  // pass straight through so the latest build is always served.
  if (url.hostname.endsWith('.iframe.diy')) return;

  // ── Never cache JS/CSS bundles ───────────────────────────────────────────────
  // Vite adds content hashes to filenames — the browser HTTP cache is enough.
  // SW caching these causes stale-app issues after rebuilds.
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js.map') ||
    url.pathname.endsWith('.css.map') ||
    url.pathname.includes('/main-') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts')
  ) {
    return; // Let browser handle it natively
  }

  // ── Never intercept WebSocket / Nostr relay traffic ──────────────────────────
  if (request.url.startsWith('wss://') || request.url.startsWith('ws://')) return;

  // ── Never intercept API calls ─────────────────────────────────────────────────
  if (url.pathname.includes('/api/')) return;

  // ── Cache-first for icons, images, manifest ──────────────────────────────────
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Only cache successful, basic/cors responses
        if (
          !response ||
          response.status !== 200 ||
          (response.type !== 'basic' && response.type !== 'cors')
        ) {
          return response;
        }

        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
        return response;
      }).catch(() => {
        // Offline fallback: return cached root HTML if available
        return caches.match('/') ?? new Response('Offline', { status: 503 });
      });
    })
  );
});
