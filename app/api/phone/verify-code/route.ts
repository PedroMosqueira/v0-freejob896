import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { phone, email, code, isProfessional } = await request.json()

    console.log("[v0] === API verify-code recebido ===")
    console.log("[v0] Phone:", phone)
    console.log("[v0] Email:", email)
    console.log("[v0] Code:", code)
    console.log("[v0] isProfessional:", isProfessional)

    if (!phone || !email || !code) {
      return NextResponse.json(
        { message: "Telefone, email e código são obrigatórios" },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    )

    // Buscar usuário e verificar código
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("phone_verification_code, phone_verification_expires_at, professional_phone")
      .eq("email", email)
      .single()

    if (userError || !user) {
      console.error("[v0] Erro ao buscar usuário:", userError)
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    // Verificar se código expirou
    const now = new Date()
    const expiresAt = new Date(user.phone_verification_expires_at)

    if (now > expiresAt) {
      console.log("[v0] Código expirado")
      return NextResponse.json(
        { message: "Código expirado. Solicite um novo código." },
        { status: 400 }
      )
    }

    // Verificar se código está correto
    if (user.phone_verification_code !== code) {
      console.log("[v0] Código incorreto. Esperado:", user.phone_verification_code, "Recebido:", code)
      return NextResponse.json(
        { message: "Código incorreto" },
        { status: 400 }
      )
    }

    // Código correto! Atualizar usuário para marcar telefone como validado
    const cleanPhone = phone.replace(/\D/g, "")
    
    const { error: updateError } = await supabase
      .from("users")
      .update({
        phone_verified: true,
        professional_phone: cleanPhone,
        is_professional: isProfessional || false,
        phone_verification_code: null,
        phone_verification_expires_at: null,
      })
      .eq("email", email)

    if (updateError) {
      console.error("[v0] Erro ao atualizar usuário:", updateError)
      return NextResponse.json(
        { message: "Erro ao validar telefone" },
        { status: 500 }
      )
    }

    console.log("[v0] Telefone validado com sucesso para:", email)

    return NextResponse.json({
      success: true,
      message: "Telefone validado com sucesso!",
      phone: cleanPhone,
    })
  } catch (error) {
    console.error("[v0] Erro geral:", error)
    return NextResponse.json(
      { message: "Erro ao processar requisição" },
      { status: 500 }
    )
  }
}
