"use client"

import useSWR from "swr"
import { useEffect, useRef, useState } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { calculateDistance } from "@/lib/calculate-distance"

const ALERT_RADIUS_KM = 3
const MIN_MOVE_KM = 0.2
const MAX_CHECK_INTERVAL_MS = 5 * 60 * 1000

type AlertState = { enabled: boolean; radiusKm: number }
type Coords = { latitude: number; longitude: number }

const fetcher = async (url: string): Promise<AlertState> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error("Falha ao carregar alerta")
  return response.json()
}

function useNearbyLocationChecks(active: boolean, initialLocation: Coords) {
  const lastSent = useRef<{ coords: Coords; at: number } | null>(null)
  const initialRef = useRef(initialLocation)
  initialRef.current = initialLocation

  useEffect(() => {
    if (!active) return

    const report = (coords: Coords) => {
      const previous = lastSent.current
      const moved = previous
        ? calculateDistance(previous.coords.latitude, previous.coords.longitude, coords.latitude, coords.longitude)
        : Number.POSITIVE_INFINITY
      if (previous && moved < MIN_MOVE_KM && Date.now() - previous.at < MAX_CHECK_INTERVAL_MS) return

      lastSent.current = { coords, at: Date.now() }
      fetch("/api/nearby-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
      }).catch(() => {})
    }

    report(initialRef.current)

    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => report({ latitude: coords.latitude, longitude: coords.longitude }),
      () => {},
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [active])
}

export function NearbyAlertToggle({ location }: { location: Coords }) {
  const { data, mutate, isLoading } = useSWR("/api/nearby-alerts", fetcher)
  const push = usePushNotifications(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const active = !!data?.enabled && push.status === "on"
  useNearbyLocationChecks(active, location)

  if (isLoading || !data || push.status === "loading" || push.status === "unsupported") return null

  const busy = saving || push.busy

  const save = async (enabled: boolean) => {
    setSaving(true)
    try {
      if (enabled && push.status !== "on") {
        if (push.status === "needs-install") {
          toast({ description: "No iPhone, adicione o FreeJob à tela de início para receber avisos." })
          return
        }
        if (push.status === "denied") {
          toast({
            description: "As notificações estão bloqueadas. Libere nas configurações do navegador.",
            variant: "destructive",
          })
          return
        }
        if (!(await push.enable())) {
          toast({ description: "Não foi possível ativar as notificações.", variant: "destructive" })
          return
        }
      }

      const response = await fetch("/api/nearby-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enabled ? { enabled, ...location } : { enabled }),
      })
      if (!response.ok) throw new Error()

      await mutate({ enabled, radiusKm: ALERT_RADIUS_KM }, { revalidate: false })
      toast({
        description: enabled
          ? `Você será avisado de serviços a até ${ALERT_RADIUS_KM} km de você.`
          : "Avisos desativados.",
      })
    } catch {
      toast({ description: "Não foi possível salvar. Tente novamente.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (active) {
    return (
      <Button variant="outline" size="sm" onClick={() => save(false)} disabled={busy} aria-pressed="true">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <BellOff className="h-4 w-4" aria-hidden="true" />
        )}
        Parar avisos
      </Button>
    )
  }

  return (
    <Button size="sm" onClick={() => save(true)} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
      {`Avisar serviços a até ${ALERT_RADIUS_KM} km`}
    </Button>
  )
}
