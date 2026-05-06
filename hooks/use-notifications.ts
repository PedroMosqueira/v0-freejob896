"use client"

import { useEffect, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { notificationManager } from "@/lib/notifications"

export function useNotifications() {
  const [email, setEmail] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    setMounted(true)
    
    // Obter email da sessão atual
    const getEmail = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user?.email) {
        setEmail(session.user.email)
      }
    }

    getEmail()
  }, [])

  useEffect(() => {
    if (!mounted || !email) {
      return
    }

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${email}`,
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
  }, [mounted, email])
}
