// Service Worker cho chế độ Ngoại tuyến (Offline Mode F&B POS)
const CACHE_NAME = 'quancafe-pos-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/db-offline.js',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching offline shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Bỏ qua các API call để app.js xử lý offline trong IndexedDB
  if (event.request.url.includes('/api/') || event.request.url.includes('/ws')) {
    return;
  }
  if (event.request.method !== 'GET') return;

  // Network-first: luôn lấy bản mới nhất khi có mạng, rơi về cache khi offline.
  // (Cache-first cũ khiến trình duyệt giữ mãi app.js/index.html phiên bản cũ.)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('/index.html');
        })
      )
  );
});
