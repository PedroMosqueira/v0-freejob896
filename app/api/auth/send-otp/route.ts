import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// Armazenar OTPs em memória (em produção usar Redis)
const otpStore: Map<string, { code: string; expires: number }> = new Map()

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone || phone.length !== 11) {
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 },
      )
    }

    // Gerar código OTP (6 dígitos)
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = Date.now() + 10 * 60 * 1000 // 10 minutos

    // Armazenar OTP
    otpStore.set(phone, { code, expires })

    // TODO: Integrar com serviço de SMS real (Twilio, AWS SNS, etc)
    console.log(`[v0] OTP para ${phone}: ${code}`)

    // Em desenvolvimento, retornar o código (REMOVER EM PRODUÇÃO)
    const isDevelopment = process.env.NODE_ENV === "development"

    return NextResponse.json({
      success: true,
      message: "Código enviado para o telefone",
      ...(isDevelopment && { code }),
    })
  } catch (error) {
    console.error("Erro na rota send-otp:", error)
    return NextResponse.json(
      { error: "Erro ao enviar código" },
      { status: 500 },
    )
  }
}
