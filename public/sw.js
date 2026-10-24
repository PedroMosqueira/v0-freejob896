const CACHE_NAME = "freejob-shell-v4"
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

const RETRY_DELAYS_MS = [700, 2000]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Pages always come from the network so users never see a stale app. A single failed fetch is
// often transient (Wi-Fi/4G switch, cold start), so retry before falling back to the error page.
async function handleNavigation(request) {
  try {
    return await fetch(request)
  } catch {
    for (const delay of RETRY_DELAYS_MS) {
      await wait(delay)
      try {
        return await fetch(request.url, { credentials: "include", cache: "no-store", redirect: "follow" })
      } catch {
        // Try the next delay.
      }
    }
    return (await caches.match(OFFLINE_URL)) || Response.error()
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") return
  event.respondWith(handleNavigation(event.request))
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
