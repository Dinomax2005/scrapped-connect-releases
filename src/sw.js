/* Lately — network-first app shell with an offline fallback. */
const CACHE = 'lately-v1.1.0';
const ASSETS = [
  './', './index.html', './styles.css', './config.js', './cloud.js', './app.js', './manifest.webmanifest', './icons/lately-mark.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (error) { return; }
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
    try {
      const fresh = await fetch(request, { cache: 'no-cache' });
      if (fresh && fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    } catch (error) {
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      throw error;
    }
  })());
});
