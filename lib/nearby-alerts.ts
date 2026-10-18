import { createAdminClient } from "@/lib/stripe-subscription-sync"
import { buildNotificationUrl, safeSendPush } from "@/lib/push-notifications-server"

export const ALERT_RADIUS_KM = 3

export function formatAlertDistance(km: number): string {
  if (km < 1) return `a ${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`
  return `a ${km.toFixed(1).replace(".", ",").replace(",0", "")} km`
}

export function isValidCoordinate(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  )
}

// ~110 m precision: enough for a 3 km radius without keeping the exact address.
export function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000
}

type NearbyNeed = { id: string; title: string; city?: string | null; distanceKm: number }

/**
 * Claims each (user, need) pair before sending so the same service is never pushed twice,
 * even when a new-service alert and a location check race each other.
 */
async function deliverOnce(userEmail: string, needs: NearbyNeed[]) {
  if (needs.length === 0) return 0
  const admin = createAdminClient()
  const email = userEmail.toLowerCase()

  const { data: claimed, error } = await admin
    .from("nearby_alert_deliveries")
    .upsert(
      needs.map((need) => ({ user_email: email, need_id: need.id })),
      { onConflict: "user_email,need_id", ignoreDuplicates: true },
    )
    .select("need_id")

  if (error) {
    console.error("[nearby-alerts] Falha ao registrar envio:", error.message)
    return 0
  }

  const claimedIds = new Set((claimed || []).map((row) => row.need_id))
  const toSend = needs.filter((need) => claimedIds.has(need.id))

  await Promise.allSettled(
    toSend.map((need) =>
      safeSendPush(email, {
        title: "Serviço perto de você",
        body: `${need.title}${need.city ? ` em ${need.city}` : ""}, ${formatAlertDistance(need.distanceKm)}.`,
        data: { url: buildNotificationUrl(need.id) },
        tag: `nearby-${need.id}`,
      }),
    ),
  )

  return toSend.length
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
    const { data, error } = await createAdminClient().rpc("find_nearby_alert_recipients", {
      p_lat: need.latitude,
      p_lng: need.longitude,
      p_exclude_email: need.requesterEmail,
    })

    if (error) {
      console.error("[nearby-alerts] Falha ao buscar destinatários:", error.message)
      return
    }

    const recipients = (data || []) as { user_email: string; distance_km: number }[]
    await Promise.allSettled(
      recipients.map(({ user_email, distance_km }) =>
        deliverOnce(user_email, [{ id: need.needId, title: need.title, city: need.city, distanceKm: distance_km }]),
      ),
    )
  } catch (error) {
    console.error("[nearby-alerts] Erro inesperado:", error)
  }
}

export async function notifyUnseenNeedsNearUser(userEmail: string, latitude: number, longitude: number) {
  try {
    const { data, error } = await createAdminClient().rpc("find_unnotified_nearby_needs", {
      p_email: userEmail.toLowerCase(),
      p_lat: latitude,
      p_lng: longitude,
      p_radius_km: ALERT_RADIUS_KM,
    })

    if (error) {
      console.error("[nearby-alerts] Falha ao buscar serviços próximos:", error.message)
      return 0
    }

    const needs = ((data || []) as { id: string; title: string; city: string | null; distance_km: number }[]).map(
      (row) => ({ id: row.id, title: row.title, city: row.city, distanceKm: row.distance_km }),
    )
    return await deliverOnce(userEmail, needs)
  } catch (error) {
    console.error("[nearby-alerts] Erro inesperado:", error)
    return 0
  }
}
