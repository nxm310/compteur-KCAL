const CACHE_NAME = 'kcal-v' + Date.now();
const urlsToCache = ['/compteur-KCAL/'];

// Domaines externes à ne JAMAIS intercepter
const EXTERNAL_HOSTS = [
  'fr.openfoodfacts.org',
  'world.openfoodfacts.org',
  'api.nal.usda.gov',
  'images.openfoodfacts.org',
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
  const url = new URL(event.request.url);

  // Bypass total pour les APIs externes — le SW ne touche pas à ces requêtes
  if (EXTERNAL_HOSTS.some((host) => url.hostname === host)) {
    return; // pas de event.respondWith → le navigateur gère directement
  }

  // Pour les ressources locales : network-first, cache en fallback
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => {
        // Si rien en cache non plus, on laisse l'erreur remonter proprement
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
