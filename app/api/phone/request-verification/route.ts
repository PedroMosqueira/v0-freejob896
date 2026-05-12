import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { phone, email } = await request.json()

    if (!phone || !email) {
      return NextResponse.json(
        { message: "Telefone e email são obrigatórios" },
        { status: 400 }
      )
    }

    // Validar formato de telefone (11 dígitos)
    if (!/^\d{11}$/.test(phone)) {
      return NextResponse.json(
        { message: "Telefone deve ter exatamente 11 dígitos" },
        { status: 400 }
      )
    }

    console.log("[v0] Solicitando verificação para:", phone, "email:", email)

    // Gerar código de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutos

    // Criar cliente Supabase com service role para operações administrativas
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    )

    // Salvar código no banco de dados do usuário
    const { error: updateError } = await supabase
      .from("users")
      .update({
        phone_verification_code: verificationCode,
        phone_verification_expires_at: expiresAt,
      })
      .eq("email", email)

    if (updateError) {
      console.error("[v0] Erro ao salvar código de verificação:", updateError)
      return NextResponse.json(
        { message: "Erro ao solicitar verificação" },
        { status: 500 }
      )
    }

    // TODO: Enviar SMS com o código via Twilio ou outro serviço
    // Por enquanto, apenas logar o código para testes
    console.log(`[v0] Código de verificação para ${phone}: ${verificationCode}`)

    return NextResponse.json({
      success: true,
      message: "Código enviado por SMS",
    })
  } catch (error) {
    console.error("[v0] Erro em request-verification:", error)
    return NextResponse.json(
      { message: "Erro ao processar requisição" },
      { status: 500 }
    )
  }
}
