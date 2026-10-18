import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/stripe-subscription-sync"
import {
  ALERT_RADIUS_KM,
  isValidCoordinate,
  notifyUnseenNeedsNearUser,
  roundCoordinate,
} from "@/lib/nearby-alerts"

async function getUserEmail() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email?.toLowerCase() ?? null
}

type Body = { enabled?: unknown; latitude?: unknown; longitude?: unknown }

export async function GET() {
  const email = await getUserEmail()
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { data, error } = await createAdminClient()
    .from("nearby_alerts")
    .select("enabled")
    .eq("user_email", email)
    .maybeSingle()

  if (error) return NextResponse.json({ error: "Falha ao carregar alerta" }, { status: 500 })
  return NextResponse.json({ enabled: data?.enabled ?? false, radiusKm: ALERT_RADIUS_KM })
}

/** Turns alerts on or off. Turning on also checks for open services already within the radius. */
export async function PUT(request: NextRequest) {
  const email = await getUserEmail()
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Body
  const admin = createAdminClient()

  if (body.enabled === false) {
    const { error } = await admin
      .from("nearby_alerts")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("user_email", email)
    if (error) return NextResponse.json({ error: "Falha ao desativar alerta" }, { status: 500 })
    return NextResponse.json({ enabled: false })
  }

  if (body.enabled !== true || !isValidCoordinate(body.latitude, body.longitude)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const latitude = roundCoordinate(body.latitude as number)
  const longitude = roundCoordinate(body.longitude as number)

  const { error } = await admin.from("nearby_alerts").upsert({
    user_email: email,
    latitude,
    longitude,
    radius_km: ALERT_RADIUS_KM,
    enabled: true,
    updated_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: "Falha ao salvar alerta" }, { status: 500 })

  const notified = await notifyUnseenNeedsNearUser(email, latitude, longitude)
  return NextResponse.json({ enabled: true, radiusKm: ALERT_RADIUS_KM, notified })
}

/** Location update while the app is open: pushes open services within the radius not yet notified. */
export async function POST(request: NextRequest) {
  const email = await getUserEmail()
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Body
  if (!isValidCoordinate(body.latitude, body.longitude)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const latitude = roundCoordinate(body.latitude as number)
  const longitude = roundCoordinate(body.longitude as number)

  const { data: updated, error } = await createAdminClient()
    .from("nearby_alerts")
    .update({ latitude, longitude, updated_at: new Date().toISOString() })
    .eq("user_email", email)
    .eq("enabled", true)
    .select("user_email")

  if (error) return NextResponse.json({ error: "Falha ao atualizar localização" }, { status: 500 })
  if (!updated?.length) return NextResponse.json({ notified: 0 })

  const notified = await notifyUnseenNeedsNearUser(email, latitude, longitude)
  return NextResponse.json({ notified })
}
