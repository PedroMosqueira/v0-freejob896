import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createServiceClient, formatPhoneForDisplay } from "@/lib/whatsapp-verification"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }

  const admin = createServiceClient()
  const { data } = await admin
    .from("whatsapp_phone_verifications")
    .select("status, phone, expires_at")
    .eq("id", id)
    .eq("user_email", user.email.toLowerCase())
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ message: "Validação não encontrada" }, { status: 404 })
  }

  const isExpired = data.status === "pending" && new Date(data.expires_at) < new Date()

  return NextResponse.json({
    status: isExpired ? "expired" : data.status,
    phone: data.status === "received" && data.phone ? formatPhoneForDisplay(data.phone) : null,
    expiresAt: data.expires_at,
  })
}
