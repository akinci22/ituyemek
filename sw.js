// Minimal service worker: makes the web version installable (PWA) and gives a
// basic offline shell.
//   - Content-hashed build assets (…/assets/index-<hash>.js|css) are immutable,
//     so serve them CACHE-FIRST — instant, works offline, no needless network.
//   - Everything else (HTML/navigation, manifest, icons) stays NETWORK-FIRST so
//     a new deploy is picked up, with cache + app-shell as the offline fallback.
const CACHE = 'ituyemek-shell-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Reclaim storage from previous cache versions instead of leaking them.
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function cacheSameOrigin(req, res) {
  // Only cache same-origin successful responses (skip IG/İTÜ cross-origin).
  try {
    const url = new URL(req.url);
    if (url.origin === self.location.origin && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    }
  } catch { /* ignore */ }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let isAsset = false;
  try { isAsset = new URL(req.url).pathname.includes('/assets/'); } catch { /* ignore */ }

  if (isAsset) {
    // Cache-first: hashed filenames can't go stale until the hash changes.
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => { cacheSameOrigin(req, res); return res; })
      )
    );
    return;
  }

  // Network-first for HTML/navigation/manifest/icons: fresh when online, cache
  // (then the app shell) when offline.
  e.respondWith(
    fetch(req)
      .then((res) => { cacheSameOrigin(req, res); return res; })
      .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
  );
});
