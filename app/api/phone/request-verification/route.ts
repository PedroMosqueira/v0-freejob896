import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendWhatsAppMessage, generateVerificationCode, getVerificationMessage } from "@/lib/z-api"
import { ensureUserExists } from "@/lib/ensure-user-exists"

export async function POST(request: NextRequest) {
  try {
    const { phone, email, countryCode } = await request.json()

    console.log("[v0] === API request-verification recebido ===")
    console.log("[v0] Phone raw:", phone)
    console.log("[v0] Country code:", countryCode || "+55")
    console.log("[v0] Email:", email)

    if (!phone || !email) {
      return NextResponse.json(
        { message: "Telefone e email são obrigatórios" },
        { status: 400 }
      )
    }

    // Garantir que o usuário existe no banco de dados
    console.log("[v0] Verificando/criando usuário...")
    await ensureUserExists(email)

    // Gerar código de 6 dígitos
    const verificationCode = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Criar cliente Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    )

    // Salvar código no banco de dados
    const { error: updateError } = await supabase
      .from("users")
      .update({
        phone_verification_code: verificationCode,
        phone_verification_expires_at: expiresAt,
      })
      .eq("email", email)

    if (updateError) {
      console.error("[v0] Erro ao salvar código:", updateError)
      return NextResponse.json(
        { message: "Erro ao solicitar verificação" },
        { status: 500 }
      )
    }

    // Enviar via Z-API WhatsApp
    const message = getVerificationMessage(verificationCode)
    console.log("[v0] Enviando mensagem Z-API:")
    console.log("[v0]   Telefone:", phone)
    console.log("[v0]   Código de país:", countryCode || "+55")
    console.log("[v0]   Mensagem preview:", message.substring(0, 50))
    
    const result = await sendWhatsAppMessage(phone, message, countryCode || "+55")

    console.log("[v0] Resultado Z-API:", {
      success: result.success,
      error: result.error || null,
      id: result.id || null,
    })

    if (!result.success) {
      console.error("[v0] FALHA ao enviar via Z-API:", result.error)
      return NextResponse.json(
        { message: result.error || "Erro ao enviar código" },
        { status: 500 }
      )
    }

    console.log("[v0] ✓ Mensagem WhatsApp enviada com sucesso! ID:", result.id)

    return NextResponse.json({
      success: true,
      message: "Código enviado por WhatsApp",
      messageId: result.id,
    })
  } catch (error) {
    console.error("[v0] Erro geral:", error)
    return NextResponse.json(
      { message: "Erro interno ao solicitar verificação" },
      { status: 500 }
    )
  }
}
