// Service worker mínimo (T17): la app se puede instalar y, si no hay conexión, muestra una
// página propia en lugar del error del navegador. No guarda la app ni los datos en caché:
// siempre se carga la versión publicada y los datos frescos de Supabase.
const CACHE = 'offline-v1'
const OFFLINE_URL = '/offline.html'
const OFFLINE_ASSETS = [OFFLINE_URL, '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.mode === 'navigate') {
    // Navegaciones: siempre a la red; sin conexión, la página "Sin conexión".
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }
  if (OFFLINE_ASSETS.includes(new URL(request.url).pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)))
  }
})
