const CACHE_NAME = "freejob-shell-v3"
const OFFLINE_URL = "/offline.html"
const NOTIFICATION_ICON = "/icons/icon-192.png"
// Android draws the badge as a single-color mask from the alpha channel only, so it must be
// the white glyph on a transparent background — an opaque logo renders as a blank circle.
const NOTIFICATION_BADGE = "/icons/notification-badge-96.png"
const PRECACHE = [OFFLINE_URL, NOTIFICATION_ICON, NOTIFICATION_BADGE]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

// Pages always come from the network so users never see a stale app; the cache only
// backs an offline fallback page.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
})

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : "" }
  }

  const title = data.title || "Freejob"
  const options = {
    body: data.body || "Você tem uma nova notificação",
    icon: data.icon || NOTIFICATION_ICON,
    badge: data.badge || NOTIFICATION_BADGE,
    tag: data.tag,
    renotify: Boolean(data.tag),
    data: { url: (data.data && data.data.url) || "/" },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client.navigate(target).then((c) => (c || client).focus())
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
