import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json()
    console.log("[v0] verify-otp: Recebido telefone:", phone, "código:", code)

    if (!phone || !code) {
      console.error("[v0] Telefone ou código vazio")
      return NextResponse.json(
        { error: "Telefone e código são obrigatórios" },
        { status: 400 },
      )
    }

    // Verificar configuração do Twilio Verify
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID

    console.log("[v0] verify-otp: Verificando credenciais...")
    console.log("[v0] TWILIO_ACCOUNT_SID configurado:", !!accountSid)
    console.log("[v0] TWILIO_AUTH_TOKEN configurado:", !!authToken)
    console.log("[v0] TWILIO_VERIFY_SERVICE_SID configurado:", !!verifySid)

    if (!accountSid || !authToken || !verifySid) {
      console.error("[v0] Credenciais Twilio Verify não configuradas")
      return NextResponse.json(
        { error: "Serviço de verificação não configurado" },
        { status: 500 },
      )
    }

    // Formatar telefone para formato internacional
    const formattedPhone = phone.startsWith("+") ? phone : `+55${phone}`
    console.log("[v0] Telefone formatado:", formattedPhone)

    // Criar autenticação básica para Twilio
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    // Verificar o código com Twilio Verify Service
    const url = `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`
    console.log("[v0] Enviando requisição para:", url)

    const verifyResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedPhone,
        Code: code,
      }).toString(),
    })

    const verifyData = await verifyResponse.json()
    console.log("[v0] Resposta Twilio status:", verifyResponse.status)
    console.log("[v0] Resposta Twilio body:", JSON.stringify(verifyData))

    if (!verifyResponse.ok || !verifyData.valid) {
      console.error("[v0] Código inválido ou expirado:", verifyData)
      return NextResponse.json(
        { error: "Código inválido ou expirado" },
        { status: 400 },
      )
    }

    // Código válido! Agora verificar/criar usuário no Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Buscar usuário pelo telefone
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .eq("phone", phone)
      .single()

    // Se retornar erro de "not found", é um novo usuário
    if (userError && userError.code === "PGRST116") {
      // Novo usuário - retornar para que complete o cadastro
      return NextResponse.json({
        success: true,
        userExists: false,
        message: "Telefone verificado. Complete seu cadastro.",
      })
    }

    if (userError) {
      console.error("[v0] Erro ao buscar usuário:", userError)
      return NextResponse.json(
        { error: "Erro ao processar login" },
        { status: 500 },
      )
    }

    // Usuário existe - fazer login
    console.log("[v0] Autenticação com telefone bem-sucedida para:", user.email)

    return NextResponse.json({
      success: true,
      userExists: true,
      message: "Login realizado com sucesso",
      email: user.email,
    })
  } catch (error) {
    console.error("[v0] Erro na rota verify-otp:", error)
    return NextResponse.json(
      { error: "Erro ao verificar código" },
      { status: 500 },
    )
  }
}
