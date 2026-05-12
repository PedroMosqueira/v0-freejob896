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

    // Validar formato de telefone (11-12 dígitos)
    if (!/^\d{11,12}$/.test(phone)) {
      return NextResponse.json(
        { message: "Telefone deve ter entre 11 e 12 dígitos" },
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

    // Enviar SMS com Twilio
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

    // IMPORTANTE: Configuração do TWILIO_PHONE_NUMBER
    // - Para SANDBOX (testes/desenvolvimento): Use +15555551234 (número de teste padrão Twilio)
    // - Para PRODUÇÃO: Use um número Twilio válido que você comprou (ex: +5511999999999)
    // O erro "is not a Twilio phone number or Short Code country mismatch" significa que o número
    // configurado em TWILIO_PHONE_NUMBER não é um número Twilio válido

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error("[v0] ⚠️  Credenciais Twilio não configuradas")
      console.error("[v0] TWILIO_ACCOUNT_SID:", twilioAccountSid ? "✓ Configurado" : "✗ FALTANDO")
      console.error("[v0] TWILIO_AUTH_TOKEN:", twilioAuthToken ? "✓ Configurado" : "✗ FALTANDO")
      console.error("[v0] TWILIO_PHONE_NUMBER:", twilioPhoneNumber ? "✓ Configurado" : "✗ FALTANDO")
      console.log(`[v0] Código de verificação para ${phone}: ${verificationCode}`)
      
      return NextResponse.json({
        success: true,
        message: "Código enviado (modo teste - sem SMS real. Configure Twilio para enviar SMS de verdade)",
        code: verificationCode, // Apenas para teste
      })
    }

    // Validar formato do número Twilio
    if (!twilioPhoneNumber.startsWith("+")) {
      console.error("[v0] ❌ ERRO: TWILIO_PHONE_NUMBER deve começar com +")
      console.error("[v0] Formato esperado:")
      console.error("[v0]   - Sandbox: +15555551234")
      console.error("[v0]   - Produção: +5511999999999 (número Twilio comprado)")
      
      return NextResponse.json(
        { 
          message: "Configuração inválida do número Twilio. Deve começar com +",
          error: "Invalid TWILIO_PHONE_NUMBER format"
        },
        { status: 500 }
      )
    }

    try {
      const client = twilio(twilioAccountSid, twilioAuthToken)
      
      // Formatar telefone para formato internacional (+55...)
      const phoneInternational = "+55" + phone

      console.log("[v0] 📱 Enviando SMS via Twilio:")
      console.log("[v0]   From:", twilioPhoneNumber)
      console.log("[v0]   To:", phoneInternational)
      console.log("[v0]   Código:", verificationCode)
      console.log("[v0] ⏳ Processando...")

      const message = await client.messages.create({
        body: `Seu código de verificação FreeJob é: ${verificationCode}. Válido por 10 minutos.`,
        from: twilioPhoneNumber,
        to: phoneInternational,
      })

      console.log("[v0] ✅ SMS enviado com sucesso!")
      console.log("[v0]   Message SID:", message.sid)
      console.log("[v0]   Status:", message.status)

      return NextResponse.json({
        success: true,
        message: "Código enviado por SMS",
        messageSid: message.sid,
      })
    } catch (twilioError: any) {
      console.error("[v0] ❌ Erro ao enviar SMS com Twilio:")
      console.error("[v0]   Mensagem:", twilioError.message)
      console.error("[v0]   Código de erro:", twilioError.code)
      
      // Erro 21659 = Invalid 'From' phone number
      if (twilioError.code === 21659) {
        console.error("[v0] 🔴 PROBLEMA: O número em TWILIO_PHONE_NUMBER não é válido")
        console.error("[v0] Solução:")
        console.error("[v0]   1. Se estiver testando: Use +15555551234 (número de teste Twilio)")
        console.error("[v0]   2. Se em produção: Compre um número Twilio válido no console.twilio.com")
        console.error("[v0]   3. Após obter o número, configure TWILIO_PHONE_NUMBER com o novo valor")
      }
      
      return NextResponse.json(
        { 
          message: "Erro ao enviar código por SMS. Verifique as credenciais Twilio.",
          error: twilioError.message,
          code: twilioError.code,
          help: twilioError.code === 21659 ? "O número Twilio configurado é inválido. Verifique TWILIO_PHONE_NUMBER nos logs acima." : undefined
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[v0] Erro em request-verification:", error)
    return NextResponse.json(
      { message: "Erro ao processar requisição" },
      { status: 500 }
    )
  }
}
