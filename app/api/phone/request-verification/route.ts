import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import twilio from "twilio"

export async function POST(request: NextRequest) {
  try {
    const { phone, email } = await request.json()

    if (!phone || !email) {
      return NextResponse.json(
        { message: "Telefone e email são obrigatórios" },
        { status: 400 }
      )
    }

    // Gerar código de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
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
      return NextResponse.json(
        { message: "Erro ao solicitar verificação" },
        { status: 500 }
      )
    }

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log(`Código para ${phone}: ${verificationCode}`)
      return NextResponse.json({
        success: true,
        message: "Código enviado",
        code: verificationCode,
      })
    }

    try {
      const client = twilio(twilioAccountSid, twilioAuthToken)
      const phoneOnlyDigits = phone.replace(/\D/g, "")
      const phoneInternational = phoneOnlyDigits.startsWith("55") 
        ? "+" + phoneOnlyDigits 
        : "+55" + phoneOnlyDigits

      const message = await client.messages.create({
        body: `Seu código de verificação FreeJob é: ${verificationCode}. Válido por 10 minutos.`,
        from: twilioPhoneNumber,
        to: phoneInternational,
      })

      return NextResponse.json({
        success: true,
        message: "Código enviado por SMS",
        messageSid: message.sid,
      })
    } catch (twilioError: any) {
      return NextResponse.json(
        { 
          message: "Erro ao enviar SMS",
          error: twilioError.message
        },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao processar requisição" },
      { status: 500 }
    )
  }
}
