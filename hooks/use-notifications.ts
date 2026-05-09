"use client"

import { useEffect, useRef, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { notificationManager } from "@/lib/notifications"

export function useNotifications() {
  const [email, setEmail] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const supabase = createSupabaseBrowserClient()
  const channelRef = useRef<any>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

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

    return () => {
      // Cleanup ao desmontar
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!mounted || !email) {
      return
    }

    // Limpar listener anterior antes de criar novo
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`user-notifications-${email}`, {
        config: {
          broadcast: { self: true },
        },
      })
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
      .subscribe((status) => {
        console.log("[v0] Notificações realtime status:", status)
      })

    channelRef.current = channel

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [mounted, email, supabase])
}
