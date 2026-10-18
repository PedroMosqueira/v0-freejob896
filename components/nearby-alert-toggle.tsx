"use client"

import useSWR from "swr"
import { useState } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import type { RadiusKm } from "./nearby-bar"

type AlertState = { enabled: boolean; radiusKm: number | null }

const fetcher = async (url: string): Promise<AlertState> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error("Falha ao carregar alerta")
  return response.json()
}

interface NearbyAlertToggleProps {
  location: { latitude: number; longitude: number }
  radiusKm: RadiusKm
}

export function NearbyAlertToggle({ location, radiusKm }: NearbyAlertToggleProps) {
  const { data, mutate, isLoading } = useSWR("/api/nearby-alerts", fetcher)
  const push = usePushNotifications(true)
  const [saving, setSaving] = useState(false)
  const { toast: showToast } = useToast()
  const toast = {
    info: (description: string) => showToast({ description }),
    success: (description: string) => showToast({ description }),
    error: (description: string) => showToast({ description, variant: "destructive" }),
  }

  if (isLoading || !data || push.status === "loading" || push.status === "unsupported") return null

  const active = data.enabled && push.status === "on"
  const outdatedRadius = active && data.radiusKm !== radiusKm
  const busy = saving || push.busy

  const save = async (enabled: boolean) => {
    setSaving(true)
    try {
      if (enabled && push.status !== "on") {
        if (push.status === "needs-install") {
          toast.info("No iPhone, adicione o FreeJob à tela de início para receber avisos.")
          return
        }
        if (push.status === "denied") {
          toast.error("As notificações estão bloqueadas. Libere nas configurações do navegador.")
          return
        }
        const ok = await push.enable()
        if (!ok) {
          toast.error("Não foi possível ativar as notificações.")
          return
        }
      }

      const response = await fetch("/api/nearby-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enabled ? { enabled, radiusKm, ...location } : { enabled }),
      })
      if (!response.ok) throw new Error()

      await mutate(enabled ? { enabled: true, radiusKm } : { enabled: false, radiusKm: data.radiusKm }, {
        revalidate: false,
      })
      toast.success(enabled ? `Você será avisado de serviços novos em até ${radiusKm} km.` : "Avisos desativados.")
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  if (active && !outdatedRadius) {
    return (
      <Button variant="outline" size="sm" onClick={() => save(false)} disabled={busy} aria-pressed="true">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BellOff className="h-4 w-4" aria-hidden="true" />}
        Parar avisos
      </Button>
    )
  }

  return (
    <Button size="sm" onClick={() => save(true)} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
      {outdatedRadius ? `Avisar em até ${radiusKm} km` : "Avisar serviços novos"}
    </Button>
  )
}
