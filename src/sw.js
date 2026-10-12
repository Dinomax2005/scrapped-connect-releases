/* SCRAPPED Connect — offline service worker.
 *
 * Strategy: network-first for the app shell (so a published update is picked up the moment
 * the device is online), falling back to the cached copy so the studio keeps working with
 * no server and no internet. GitHub traffic is never intercepted.
 */
const CACHE = 'scrapped-connect-v1.0.1';
const ASSETS = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './core.js', './views-dash.js', './views-team.js', './views-work.js', './views-system.js', './app.js',
  './icons/icon-192.png', './icons/icon-512.png'
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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Live data only: GitHub API, release downloads and any other origin.
  if (url.origin !== self.location.origin) return;
  if (/\/(api|download)\//.test(url.pathname)) return;

  const isShell = req.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(url.pathname) || url.pathname === '/';

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: isShell });

    if (!isShell) return cached || fetch(req);          // icons: cache-first

    try {
      const fresh = await fetch(req, { cache: 'no-cache' });
      if (fresh && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data === 'clearCache') caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
});
