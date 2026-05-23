/**
 * Service Worker for handling push notifications
 * Place this file at public/sw.js
 */

self.addEventListener("push", (event) => {
  if (!event.data) {
    console.log("[SW] Push notification received with no data")
    return
  }

  try {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || "/favicon.ico",
      badge: data.badge || "/favicon.ico",
      tag: data.tag || "notification",
      data: data.data || {},
    }

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  } catch (error) {
    console.error("[SW] Failed to parse push notification:", error)
  }
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || "/"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if URL is already open in a window
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus()
        }
      }

      // If not open, open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event.notification.tag)
})
