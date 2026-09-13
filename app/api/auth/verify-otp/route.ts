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
    // Usar a chave de serviço para garantir que a validação seja persistida
    // mesmo quando as políticas RLS bloqueiam a atualização pelo cliente anônimo.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const cleanPhone = String(phone).replace(/\D/g, "")

    // Buscar tanto em phone quanto em professional_phone, pois os fluxos
    // antigos salvaram o mesmo número em colunas diferentes.
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, phone, professional_phone")
      .or(`phone.eq.${cleanPhone},professional_phone.eq.${cleanPhone},phone.eq.+55${cleanPhone},professional_phone.eq.+55${cleanPhone}`)
      .limit(1)

    const user = users?.[0]

    // Se não encontrar usuário, é um novo cadastro.
    if (!userError && !user) {
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

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      )
    }

    // Usuário existe - marcar como verificado e fazer login
    console.log("[v0] Autenticação com telefone bem-sucedida para:", user.email)

    // Marcar telefone como verificado
    const { error: updateError } = await supabase
      .from("users")
      .update({
        phone_verified: true,
        phone: cleanPhone,
        professional_phone: cleanPhone,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[v0] Erro ao marcar telefone como verificado:", updateError)
      // Continuar mesmo se falhar (não é crítico)
    } else {
      console.log("[v0] Telefone marcado como verificado para:", phone)
    }

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
