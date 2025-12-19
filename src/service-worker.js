const CACHE_NAME = 'miAzukr-cache-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  )
})
