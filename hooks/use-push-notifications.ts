"use client"

import { useEffect, useState } from "react"
import {
  registerServiceWorker,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscriptionStatus,
} from "@/lib/push-notifications-client"
import { useAuth } from "@/lib/auth"

export function usePushNotifications() {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    if (!publicKey) {
      setIsLoading(false)
      return
    }

    const initializePushNotifications = async () => {
      try {
        // Register service worker
        await registerServiceWorker()

        // Check subscription status
        const isCurrentlySubscribed = await getPushSubscriptionStatus()
        setIsSubscribed(isCurrentlySubscribed)
      } catch (error) {
        console.error("[v0] Failed to initialize push notifications:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializePushNotifications()
  }, [publicKey])

  const subscribe = async () => {
    if (!publicKey || !user?.email) {
      console.error("[v0] Missing VAPID public key or user email")
      return false
    }

    try {
      setIsLoading(true)

      const subscription = await subscribeToPushNotifications(publicKey)
      if (!subscription) {
        return false
      }

      // Send subscription to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          email: user.email,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save subscription to server")
      }

      setIsSubscribed(true)
      console.log("[v0] Successfully subscribed to push notifications")
      return true
    } catch (error: any) {
      console.error("[v0] Failed to subscribe to push notifications:", error.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribe = async () => {
    if (!user?.email) {
      console.error("[v0] Missing user email")
      return false
    }

    try {
      setIsLoading(true)

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        setIsSubscribed(false)
        return true
      }

      // Remove subscription from server
      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          email: user.email,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to remove subscription from server")
      }

      // Unsubscribe from browser
      await unsubscribeFromPushNotifications()

      setIsSubscribed(false)
      console.log("[v0] Successfully unsubscribed from push notifications")
      return true
    } catch (error: any) {
      console.error("[v0] Failed to unsubscribe from push notifications:", error.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isSubscribed,
    isLoading,
    isSupported: !!publicKey,
    subscribe,
    unsubscribe,
  }
}
