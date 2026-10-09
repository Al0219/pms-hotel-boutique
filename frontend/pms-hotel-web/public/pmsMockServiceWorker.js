// Staff confirmed reads/writes are native BFF requests, even with general mocks.
// Register this listener before MSW's generated worker; do not call respondWith.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (
    url.origin === self.location.origin && (
      (event.request.method === 'GET' && /^\/api\/staff\/(?:reservations(?:\/[^/]+)?|rooms|room-types)\/?$/.test(url.pathname)) ||
      (event.request.method === 'POST' && /^\/api\/staff\/(?:rooms|room-types)\/?$/.test(url.pathname)) ||
      (event.request.method === 'PATCH' && /^\/api\/staff\/(?:rooms|room-types)\/[^/]+\/?$/.test(url.pathname))
    )
  ) {
    event.stopImmediatePropagation()
  }
})

// Keep the generated MSW worker intact so other mocks and integrity checks work.
importScripts('/mockServiceWorker.js')
