"use client"

import { useEffect, useRef, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { notificationManager } from "@/lib/notifications"

export function useNotifications() {
  const [email, setEmail] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()
  const channelRef = useRef<any>(null)
  const listenerSetupRef = useRef<string | null>(null)

  useEffect(() => {
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        listenerSetupRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!email) {
      return
    }

    // Se o listener já está configurado para este email, não fazer nada
    if (listenerSetupRef.current === email) {
      return
    }

    // Remover listener anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Criar novo listener
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
    listenerSetupRef.current = email

    return () => {
      // Cleanup quando email muda
      if (channelRef.current && listenerSetupRef.current === email) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        listenerSetupRef.current = null
      }
    }
  }, [email])
}
