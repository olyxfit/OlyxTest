const CACHE = 'azmoon-v1'

self.addEventListener('install', (e) => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))))

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api')) return
  e.respondWith(
    fetch(request)
      .then((res) => {
        // فقط پاسخ‌های کامل ۲۰۰ کش می‌شوند — ۲۰۶ (Range برای ویدیوها) قابل کش نیست
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(request))
  )
})
