"use client"

import { useEffect, useRef } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { notificationManager } from "@/lib/notifications"

let activeChannelRef: any = null
let activeEmailRef: string | null = null

export function useNotifications() {
  const supabase = createSupabaseBrowserClient()
  const setupInProgressRef = useRef(false)

  useEffect(() => {
    let mounted = true

    const setupNotifications = async () => {
      if (setupInProgressRef.current || !mounted) return

      setupInProgressRef.current = true

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user?.email || !mounted) {
          setupInProgressRef.current = false
          return
        }

        const email = session.user.email

        // Se já está configurado para este email, não fazer nada
        if (activeEmailRef === email && activeChannelRef) {
          setupInProgressRef.current = false
          return
        }

        // Remover listener anterior se existir
        if (activeChannelRef) {
          supabase.removeChannel(activeChannelRef)
          activeChannelRef = null
        }

        // Criar novo listener
        const channel = supabase
          .channel(`realtime:${email}`, {
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
            if (status === "SUBSCRIBED") {
              console.log("[v0] Notificações realtime ativo para:", email)
            }
          })

        activeChannelRef = channel
        activeEmailRef = email
      } catch (error) {
        console.error("[v0] Erro ao setup notificações:", error)
      } finally {
        setupInProgressRef.current = false
      }
    }

    setupNotifications()

    return () => {
      mounted = false
    }
  }, [])
}
