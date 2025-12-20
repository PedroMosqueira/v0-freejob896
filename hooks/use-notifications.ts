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

    const supabase = createSupabaseBrowserClient()

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
          const notification = payload.new as {
            title: string
            message: string
            type: string
            related_need_id?: string
            related_proposal_id?: string
          }

          notificationManager.show({
            title: notification.title,
            body: notification.message,
            type: notification.type as any,
            needId: notification.related_need_id,
            proposalId: notification.related_proposal_id,
          })

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("new-notification"))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [mounted, session])
}
