"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { notificationManager } from "@/lib/notifications"

export function useNotifications() {
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !session?.user?.email) {
      return
    }

    console.log("[v0] Notifications hook active for:", session.user.email)

    const supabase = createSupabaseBrowserClient()

    // Subscribe to notifications table for real-time updates
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.email}`,
        },
        (payload) => {
          console.log("[v0] New notification received:", payload)
          const notification = payload.new as {
            title: string
            message: string
            type: string
            related_need_id?: string
            related_proposal_id?: string
          }

          // Show browser notification
          notificationManager.show({
            title: notification.title,
            body: notification.message,
            type: notification.type as any,
            needId: notification.related_need_id,
            proposalId: notification.related_proposal_id,
          })
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('new-notification'))
          }
        }
      )
      .subscribe((status) => {
        console.log("[v0] Notification subscription status:", status)
      })

    // Clean up subscription on unmount
    return () => {
      console.log("[v0] Unsubscribing from notifications")
      supabase.removeChannel(channel)
    }
  }, [mounted, session])
}
