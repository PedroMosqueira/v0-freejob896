import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { grantFreeCreditsIfFirstTime } from "@/lib/phone-credits"

export async function POST(request: NextRequest) {
  try {
    const { phone, code, email } = await request.json()

    if (!phone || !code || !email) {
      return NextResponse.json(
        { message: "Telefone, código e email são obrigatórios" },
        { status: 400 }
      )
    }

    // Criar cliente Supabase com service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    )

    // Buscar o usuário
    const { data: user, error: selectError } = await supabase
      .from("users")
      .select("phone_verification_code, phone_verification_expires_at, phone_verified, is_professional")
      .eq("email", email)
      .single()

    if (selectError || !user) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 400 }
      )
    }

    // Verificar se o código está expirado
    const now = new Date()
    const expiresAt = new Date(user.phone_verification_expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json(
        { message: "Código expirado. Solicite um novo código." },
        { status: 400 }
      )
    }

    // Verificar se o código está correto
    if (user.phone_verification_code !== code) {
      return NextResponse.json(
        { message: "Código inválido" },
        { status: 400 }
      )
    }

    // Atualizar perfil do usuário para marcar telefone como validado
    const { error: updateError } = await supabase
      .from("users")
      .update({
        phone: phone,
        phone_verified: true,
        phone_verification_code: null,
        phone_verification_expires_at: null,
      })
      .eq("email", email)

    if (updateError) {
      return NextResponse.json(
        { message: "Erro ao salvar telefone validado" },
        { status: 500 }
      )
    }

    // Grant free credits if this is a professional and first validation
    let creditsGranted = false
    if (user.is_professional) {
      const creditResult = await grantFreeCreditsIfFirstTime(email)
      creditsGranted = creditResult.creditsGranted
    }

    return NextResponse.json({
      success: true,
      message: creditsGranted 
        ? "Telefone validado! Você recebeu 3 propostas gratuitas."
        : "Telefone validado com sucesso",
      phone: phone,
      creditsGranted,
    })
  } catch (error) {
    console.error("[v0] Erro ao verificar telefone:", error)
    return NextResponse.json(
      { message: "Erro ao processar requisição" },
      { status: 500 }
    )
  }
}
