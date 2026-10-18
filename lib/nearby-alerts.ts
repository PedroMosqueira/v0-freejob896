import { createAdminClient } from "@/lib/stripe-subscription-sync"
import { buildNotificationUrl, safeSendPush } from "@/lib/push-notifications-server"

export const ALERT_RADIUS_OPTIONS = [10, 25, 50, 100] as const
export type AlertRadiusKm = (typeof ALERT_RADIUS_OPTIONS)[number]

export function isAlertRadius(value: unknown): value is AlertRadiusKm {
  return typeof value === "number" && (ALERT_RADIUS_OPTIONS as readonly number[]).includes(value)
}

export function formatAlertDistance(km: number): string {
  if (km < 1) return "a menos de 1 km"
  return `a ${Math.round(km)} km`
}

export async function notifyNearbyProfessionals(need: {
  needId: string
  title: string
  city?: string | null
  latitude: number
  longitude: number
  requesterEmail: string
}) {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc("find_nearby_alert_recipients", {
      p_lat: need.latitude,
      p_lng: need.longitude,
      p_exclude_email: need.requesterEmail,
    })

    if (error) {
      console.error("[nearby-alerts] Falha ao buscar destinatários:", error.message)
      return
    }

    const recipients = (data || []) as { user_email: string; distance_km: number }[]
    const place = need.city ? ` em ${need.city}` : ""

    await Promise.allSettled(
      recipients.map(({ user_email, distance_km }) =>
        safeSendPush(user_email, {
          title: "Novo serviço perto de você",
          body: `${need.title}${place}, ${formatAlertDistance(distance_km)}.`,
          data: { url: buildNotificationUrl(need.needId) },
          tag: `nearby-${need.needId}`,
        }),
      ),
    )
  } catch (error) {
    console.error("[nearby-alerts] Erro inesperado:", error)
  }
}
