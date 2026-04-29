import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone || phone.length !== 11) {
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 },
      )
    }

    // Verificar configuração do Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      console.error("[v0] Credenciais Twilio não configuradas")
      return NextResponse.json(
        { error: "Serviço de SMS não configurado" },
        { status: 500 },
      )
    }

    // Gerar código OTP (6 dígitos)
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutos

    // Formatar telefone para formato internacional (+55 para Brasil)
    const formattedPhone = phone.startsWith("+") ? phone : `+55${phone}`

    // Salvar OTP no banco de dados
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { error: updateError } = await supabase
      .from("users")
      .update({
        phone_verification_code: code,
        phone_verification_expires_at: expiresAt,
      })
      .eq("phone", phone)

    // Se não encontrou usuário, apenas salvar o código em memória (novo usuário)
    if (updateError && updateError.code !== "PGRST116") {
      console.error("[v0] Erro ao salvar OTP:", updateError)
    }

    // Enviar SMS via Twilio
    const client = twilio(accountSid, authToken)
    
    try {
      await client.messages.create({
        body: `Seu código de verificação Freejob é: ${code}\nVálido por 10 minutos.`,
        from: fromNumber,
        to: formattedPhone,
      })

      console.log(`[v0] OTP enviado para ${formattedPhone}: ${code}`)

      return NextResponse.json({
        success: true,
        message: "Código enviado para o telefone",
      })
    } catch (smsError) {
      console.error("[v0] Erro ao enviar SMS via Twilio:", smsError)
      
      // Em desenvolvimento, retornar o código para teste
      const isDevelopment = process.env.NODE_ENV === "development"
      
      if (isDevelopment) {
        console.log(`[v0] Modo desenvolvimento - Código de teste: ${code}`)
        return NextResponse.json({
          success: true,
          message: "Código enviado para o telefone",
          code, // Apenas em desenvolvimento
        })
      }

      return NextResponse.json(
        { error: "Erro ao enviar SMS. Tente novamente." },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Erro na rota send-otp:", error)
    return NextResponse.json(
      { error: "Erro ao enviar código" },
      { status: 500 },
    )
  }
}
