"use client"

import { useCallback, useEffect, useState } from "react"
import { getCurrentSubscription, isPushSupported, subscribeToPush } from "@/lib/push-notifications-client"
import { isIOS, isStandalone } from "@/lib/pwa"

export type PushStatus = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on"

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function usePushNotifications(enabled: boolean) {
  const [status, setStatus] = useState<PushStatus>("loading")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    const check = async () => {
      if (!publicKey) return setStatus("unsupported")
      if (isIOS() && !isStandalone()) return setStatus("needs-install")
      if (!isPushSupported()) return setStatus("unsupported")
      if (Notification.permission === "denied") return setStatus("denied")

      const subscription = await getCurrentSubscription()
      if (cancelled) return
      if (subscription && Notification.permission === "granted") {
        setStatus("on")
        // Re-sync so the device stays linked to whoever is logged in now.
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        }).catch(() => {})
      } else {
        setStatus("off")
      }
    }

    check().catch(() => !cancelled && setStatus("off"))
    return () => {
      cancelled = true
    }
  }, [enabled])

  const enable = useCallback(async () => {
    if (!publicKey) return false
    setBusy(true)
    try {
      const subscription = await subscribeToPush(publicKey)
      if (!subscription) {
        setStatus(Notification.permission === "denied" ? "denied" : "off")
        return false
      }
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })
      if (!response.ok) throw new Error("subscribe failed")
      setStatus("on")
      return true
    } catch {
      setStatus("off")
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const subscription = await getCurrentSubscription()
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setStatus("off")
      return true
    } catch {
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  return { status, busy, enable, disable }
}
