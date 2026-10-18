import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/whatsapp-verification"
import { grantFreeCreditsForPhone } from "@/lib/phone-credits"

const PHONE_IN_USE_MESSAGE = "Este número já está cadastrado em outra conta. Tente com outro número."

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { confirm, isProfessional } = (await request.json().catch(() => ({}))) as {
    confirm?: boolean
    isProfessional?: boolean
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }

  const email = user.email.toLowerCase()
  const admin = createServiceClient()

  const { data: verification } = await admin
    .from("whatsapp_phone_verifications")
    .select("status, phone")
    .eq("id", id)
    .eq("user_email", email)
    .maybeSingle()

  if (!verification || verification.status !== "received" || !verification.phone) {
    return NextResponse.json({ message: "Esta validação não está mais disponível. Gere um novo código." }, { status: 409 })
  }

  const now = new Date().toISOString()

  if (confirm !== true) {
    await admin
      .from("whatsapp_phone_verifications")
      .update({ status: "rejected", resolved_at: now })
      .eq("id", id)
      .eq("status", "received")
    return NextResponse.json({ success: true, rejected: true })
  }

  const { data: profile } = await admin.from("users").select("is_professional").ilike("email", email).maybeSingle()

  if (!profile) {
    return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 })
  }

  if (!profile.is_professional && isProfessional !== true) {
    return NextResponse.json({ message: 'Marque "Sou profissional" para validar seu telefone.' }, { status: 400 })
  }

  const phone = verification.phone

  const { data: owner } = await admin
    .from("users")
    .select("email")
    .eq("phone_verified", true)
    .or(`professional_phone.eq.${phone},phone.eq.${phone}`)
    .not("email", "ilike", email)
    .limit(1)
    .maybeSingle()

  if (owner) {
    await admin
      .from("whatsapp_phone_verifications")
      .update({ status: "rejected", resolved_at: now })
      .eq("id", id)
    return NextResponse.json(
      { message: PHONE_IN_USE_MESSAGE, phoneInUse: true },
      { status: 409 },
    )
  }

  // Claim the attempt first so a double click can't validate twice.
  const { data: claimed } = await admin
    .from("whatsapp_phone_verifications")
    .update({ status: "confirmed", resolved_at: now })
    .eq("id", id)
    .eq("status", "received")
    .select("id")
    .maybeSingle()

  if (!claimed) {
    return NextResponse.json({ message: "Esta validação já foi concluída." }, { status: 409 })
  }

  const { error: updateError } = await admin
    .from("users")
    .update({
      phone,
      professional_phone: phone,
      phone_verified: true,
      is_professional: true,
      phone_verification_code: null,
      phone_verification_expires_at: null,
    })
    .ilike("email", email)

  if (updateError) {
    await admin.from("whatsapp_phone_verifications").update({ status: "rejected" }).eq("id", id)

    // The unique index on verified phones catches a race with another account validating the same number.
    if (updateError.code === "23505") {
      return NextResponse.json({ message: PHONE_IN_USE_MESSAGE, phoneInUse: true }, { status: 409 })
    }
    return NextResponse.json({ message: "Erro ao salvar o telefone validado." }, { status: 500 })
  }

  const { creditsGranted } = await grantFreeCreditsForPhone(email, phone)

  return NextResponse.json({
    success: true,
    phone,
    creditsGranted,
    message: creditsGranted
      ? "Telefone validado! Você recebeu 3 propostas gratuitas."
      : "Telefone validado! As propostas gratuitas deste número já foram concedidas antes.",
  })
}
