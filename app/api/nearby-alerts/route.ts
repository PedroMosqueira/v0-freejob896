import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/stripe-subscription-sync"
import { isAlertRadius } from "@/lib/nearby-alerts"

async function getUserEmail() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email?.toLowerCase() ?? null
}

export async function GET() {
  const email = await getUserEmail()
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { data, error } = await createAdminClient()
    .from("nearby_alerts")
    .select("enabled, radius_km")
    .eq("user_email", email)
    .maybeSingle()

  if (error) return NextResponse.json({ error: "Falha ao carregar alerta" }, { status: 500 })
  return NextResponse.json({ enabled: data?.enabled ?? false, radiusKm: data?.radius_km ?? null })
}

export async function PUT(request: NextRequest) {
  const email = await getUserEmail()
  if (!email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    enabled?: unknown
    latitude?: unknown
    longitude?: unknown
    radiusKm?: unknown
  }

  const admin = createAdminClient()

  if (body.enabled === false) {
    const { error } = await admin
      .from("nearby_alerts")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("user_email", email)
    if (error) return NextResponse.json({ error: "Falha ao desativar alerta" }, { status: 500 })
    return NextResponse.json({ enabled: false })
  }

  const { latitude, longitude, radiusKm } = body
  const valid =
    body.enabled === true &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    isAlertRadius(radiusKm)

  if (!valid) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })

  // Stored at ~1 km precision: enough for radius matching without keeping the exact address.
  const { error } = await admin.from("nearby_alerts").upsert({
    user_email: email,
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
    radius_km: radiusKm,
    enabled: true,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: "Falha ao salvar alerta" }, { status: 500 })
  return NextResponse.json({ enabled: true, radiusKm })
}
