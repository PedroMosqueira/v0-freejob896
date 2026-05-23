/**
 * Client-side push notification utilities
 */

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("[v0] Service Workers not supported")
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    })
    console.log("[v0] Service Worker registered successfully")
    return registration
  } catch (error: any) {
    console.error("[v0] Service Worker registration failed:", error.message)
    return null
  }
}

export async function subscribeToPushNotifications(
  publicKey: string
): Promise<PushSubscriptionJSON | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("[v0] Push notifications not supported")
      return null
    }

    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.log("[v0] Notification permission denied")
      return null
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Create subscription
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    console.log("[v0] Push notification subscription created")
    return subscription.toJSON()
  } catch (error: any) {
    console.error("[v0] Failed to subscribe to push notifications:", error.message)
    return null
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      console.log("[v0] Push notification subscription removed")
      return true
    }

    return false
  } catch (error: any) {
    console.error("[v0] Failed to unsubscribe from push notifications:", error.message)
    return false
  }
}

export async function getPushSubscriptionStatus(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    return subscription !== null
  } catch (error) {
    return false
  }
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export interface PushSubscriptionJSON {
  endpoint: string
  auth: string
  p256dh: string
}
