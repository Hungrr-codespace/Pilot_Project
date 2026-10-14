// Hungrr's service worker: lets phones install the site ("Add to home screen") and opens it without internet.
// - Pages: always from the network; the last copy is kept for when there is no connection.
// - Built scripts and styles (their names carry a fingerprint, so they never change): kept after first use.
// - Everything else, including the Google Sheet, fonts and map tiles: straight to the network, never stored.
// Change CACHE to clear old copies from every phone.
const CACHE = 'hungrr-v1';
const FINGERPRINTED = /\/assets\/.+-[A-Za-z0-9_-]{8}\.(js|css)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['/', '/logo.svg', '/icons/icon-192.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  if (FINGERPRINTED.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
