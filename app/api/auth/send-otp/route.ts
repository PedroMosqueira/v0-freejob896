import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()
    console.log("[v0] send-otp: Recebido telefone:", phone)

    if (!phone || phone.length < 11 || phone.length > 12) {
      console.error("[v0] Telefone inválido. Comprimento:", phone?.length)
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 },
      )
    }

    // Verificar configuração do Twilio Verify
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID

    console.log("[v0] send-otp: Verificando credenciais...")
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

    // Formatar telefone para formato internacional (+55 para Brasil)
    const formattedPhone = phone.startsWith("+") ? phone : `+55${phone}`
    console.log("[v0] Telefone formatado:", formattedPhone)

    // Criar autenticação básica para Twilio
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    // Enviar verificação via Twilio Verify Service
    const url = `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`
    console.log("[v0] Enviando requisição para:", url)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedPhone,
        Channel: "sms",
      }).toString(),
    })

    const data = await response.json()
    console.log("[v0] Resposta Twilio status:", response.status)
    console.log("[v0] Resposta Twilio body:", JSON.stringify(data))

    if (!response.ok) {
      console.error("[v0] Erro ao enviar verificação Twilio:", data)
      return NextResponse.json(
        { error: data.message || "Erro ao enviar código" },
        { status: response.status },
      )
    }

    console.log(`[v0] Código de verificação enviado para ${formattedPhone}`)

    return NextResponse.json({
      success: true,
      message: "Código enviado para o telefone",
    })
  } catch (error) {
    console.error("[v0] Erro na rota send-otp:", error)
    console.error("[v0] Stack trace:", error instanceof Error ? error.stack : "")
    return NextResponse.json(
      { error: "Erro ao enviar código" },
      { status: 500 },
    )
  }
}
