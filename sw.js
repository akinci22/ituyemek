// Minimal service worker: makes the web version installable (PWA) and gives a
// basic offline shell. Network-first; falls back to cache, then the app shell.
const CACHE = 'ituyemek-shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        // Only cache same-origin successful responses (skip IG/İTÜ cross-origin).
        try {
          const url = new URL(req.url);
          if (url.origin === self.location.origin && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
        } catch { /* ignore */ }
        return res;
      })
      .catch(() =>
        caches.match(req).then((m) => m || caches.match('./index.html'))
      )
  );
});
