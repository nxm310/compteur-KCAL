const CACHE_NAME = 'kcal-v' + Date.now();
const urlsToCache = ['/'];

// Domaines externes à ne JAMAIS intercepter
const EXTERNAL_HOSTS = [
  'fr.openfoodfacts.org',
  'world.openfoodfacts.org',
  'search.openfoodfacts.org',
  'api.nal.usda.gov',
  'images.openfoodfacts.org',
  'corsproxy.io',
  'generativelanguage.googleapis.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Seules les requêtes GET sont éligibles au cache
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Bypass total pour les APIs externes et les endpoints de synchronisation/backend
  if (
    EXTERNAL_HOSTS.some((host) => url.hostname === host) ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Pour les ressources locales : network-first avec mise en cache dynamique des bundles
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
