// TradeJournal Service Worker — Network First Strategy
// Versi: 2.0.0  ← naikkan versi ini setiap deploy agar SW lama dihapus otomatis

const CACHE_VERSION = 'v2';
const CACHE_NAME = `tradejournal-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Aset statis yang di-pre-cache saat install
const PRECACHE_ASSETS = [
  '/offline.html',
];

// ── Daftar host yang WAJIB bypass (jangan di-cache sama sekali) ────────
// Tambahkan semua domain eksternal / auth / API di sini
const BYPASS_PATTERNS = [
  'supabase.co',
  'supabase.com',
  'anthropic.com',
  'googleapis.com',
  'gstatic.com',
  'r2.dev',
  'cloudflare.com',
  'lovable.app',
  'lovable.dev',
  // Tambah domain lain jika perlu
];

// ── Ekstensi yang boleh di-cache (aset statis saja) ───────────────────
const CACHEABLE_EXTENSIONS = ['.css', '.js', '.woff2', '.woff', '.png', '.svg', '.ico', '.webp'];

// ── Tipe request yang TIDAK boleh di-cache ─────────────────────────────
// POST/PUT/DELETE/PATCH → jangan pernah di-intercept
function isBypassRequest(request, url) {
  // 1. Bypass semua method selain GET
  if (request.method !== 'GET') return true;

  // 2. Bypass protocol non-http
  if (!url.protocol.startsWith('http')) return true;

  // 3. Bypass chrome-extension dan sejenisnya
  if (url.protocol === 'chrome-extension:') return true;

  // 4. Bypass host eksternal
  if (BYPASS_PATTERNS.some((pattern) => url.hostname.includes(pattern))) return true;

  // 5. Bypass semua URL yang mengandung "/auth/" atau "/rest/" atau "/realtime/"
  // (path Supabase yang kadang lolos karena CORS redirect)
  if (/\/(auth|rest|realtime|storage|functions)\//.test(url.pathname)) return true;

  return false;
}

function isCacheable(url) {
  return CACHEABLE_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

// ── Install ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Install — versi:', CACHE_VERSION);
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW] Pre-cache sebagian gagal, lanjut:', err);
        })
      )
      .then(() => self.skipWaiting()) // aktifkan SW baru segera
  );
});

// ── Activate ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate — hapus cache lama');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith('tradejournal-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Hapus cache lama:', name);
              return caches.delete(name);
            })
        )
      )
      .then(() => self.clients.claim()) // ambil kontrol semua tab segera
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Langsung bypass — jangan intercept sama sekali
  if (isBypassRequest(event.request, url)) return;

  event.respondWith(networkFirst(event.request, url));
});

async function networkFirst(request, url) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Selalu coba network dulu
    const networkResponse = await fetch(request.clone());

    // Hanya cache aset statis yang berhasil
    if (networkResponse.ok && isCacheable(url)) {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }

    return networkResponse;
  } catch (err) {
    // Network gagal → coba cache
    console.warn('[SW] Network gagal, cek cache:', request.url, err);
    const cached = await cache.match(request);
    if (cached) return cached;

    // Fallback halaman offline hanya untuk navigasi
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match(OFFLINE_URL);
      if (offlinePage) return offlinePage;
      return new Response(
        '<!DOCTYPE html><html lang="id"><body style="font-family:sans-serif;text-align:center;padding:2rem"><h1>Tidak ada koneksi</h1><p>Buka kembali saat online.</p><button onclick="location.reload()">Coba Lagi</button></body></html>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    return new Response('Network error', { status: 503 });
  }
}

// ── Pesan dari halaman (force update/clear cache) ─────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
  }
});
