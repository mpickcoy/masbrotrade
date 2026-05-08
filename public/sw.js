// TradeJournal Service Worker — Network First Strategy
// Versi: 1.0.0

const CACHE_NAME = 'tradejournal-v1';
const OFFLINE_URL = '/offline.html';

// Aset statis yang di-cache saat install
const PRECACHE_ASSETS = [
  '/offline.html',
];

// Domain yang TIDAK boleh di-intercept (butuh koneksi langsung)
const BYPASS_HOSTS = [
  'supabase.co',
  'supabase.com',
  'anthropic.com',
  'googleapis.com',
  'gstatic.com',
  'r2.dev',
];

// ── Install ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Lanjut meski aset offline gagal di-cache
      });
    })
  );
  // Aktifkan SW baru langsung tanpa tunggu tab lama tertutup
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Ambil kontrol semua client langsung
  self.clients.claim();
});

// ── Fetch (Network First) ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Hanya handle GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass domain eksternal (Supabase, Anthropic, Google Fonts, dll.)
  if (BYPASS_HOSTS.some((host) => url.hostname.includes(host))) return;

  // Bypass chrome-extension dan non-http
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Coba network dulu
    const networkResponse = await fetch(request);

    // Cache response statis yang berhasil
    if (networkResponse.ok && isCacheable(request.url)) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // Network gagal → cek cache
    const cached = await cache.match(request);
    if (cached) return cached;

    // Fallback ke halaman offline untuk navigasi
    if (request.mode === 'navigate') {
      return cache.match(OFFLINE_URL) || new Response(
        '<h1>Tidak ada koneksi internet</h1><p>Buka kembali saat online.</p>',
        { status: 503, headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response('Network error', { status: 503 });
  }
}

function isCacheable(url) {
  return (
    url.endsWith('.css') ||
    url.endsWith('.js') ||
    url.endsWith('.woff2') ||
    url.endsWith('.woff') ||
    url.endsWith('.png') ||
    url.endsWith('.svg') ||
    url.endsWith('.ico')
  );
}
