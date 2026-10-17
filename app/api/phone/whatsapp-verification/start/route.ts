import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  MAX_ATTEMPTS_PER_HOUR,
  VERIFICATION_TTL_MINUTES,
  buildWhatsAppLink,
  createServiceClient,
  generateVerificationCode,
} from "@/lib/whatsapp-verification"

export async function POST(request: Request) {
  const { fresh } = (await request.json().catch(() => ({}))) as { fresh?: boolean }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ message: "Faça login para validar seu telefone." }, { status: 401 })
  }

  const admin = createServiceClient()
  const email = user.email.toLowerCase()

  // Coming back from WhatsApp remounts the panel (and mobile browsers often reload the tab),
  // so resume the open attempt instead of discarding a number that already arrived.
  if (!fresh) {
    const { data: open } = await admin
      .from("whatsapp_phone_verifications")
      .select("id, code, status, expires_at")
      .eq("user_email", email)
      .in("status", ["pending", "received"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const isUsable = open && (open.status === "received" || new Date(open.expires_at) > new Date())
    const link = open ? buildWhatsAppLink(open.code) : null
    if (isUsable && link) {
      return NextResponse.json({ id: open.id, code: open.code, link, expiresAt: open.expires_at })
    }
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await admin
    .from("whatsapp_phone_verifications")
    .select("id", { count: "exact", head: true })
    .eq("user_email", email)
    .gte("created_at", oneHourAgo)

  if ((count ?? 0) >= MAX_ATTEMPTS_PER_HOUR) {
    return NextResponse.json(
      { message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
      { status: 429 },
    )
  }

  // Only one open attempt per user, so a late message for an old code can't attach a number.
  await admin
    .from("whatsapp_phone_verifications")
    .update({ status: "expired", resolved_at: new Date().toISOString() })
    .eq("user_email", email)
    .in("status", ["pending", "received"])

  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000).toISOString()

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateVerificationCode()
    const link = buildWhatsAppLink(code)
    if (!link) {
      return NextResponse.json({ message: "Validação por WhatsApp indisponível no momento." }, { status: 503 })
    }

    const { data, error } = await admin
      .from("whatsapp_phone_verifications")
      .insert({ user_email: email, code, expires_at: expiresAt })
      .select("id")
      .single()

    if (!error && data) {
      return NextResponse.json({ id: data.id, code, link, expiresAt })
    }
    // 23505 = unique violation on code; anything else is a real failure.
    if (error?.code !== "23505") break
  }

  return NextResponse.json({ message: "Não foi possível gerar o código. Tente novamente." }, { status: 500 })
}
