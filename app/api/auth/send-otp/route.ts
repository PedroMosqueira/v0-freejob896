import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone || phone.length !== 11) {
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 },
      )
    }

    // Verificar configuração do Twilio Verify
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID

    if (!accountSid || !authToken || !verifySid) {
      console.error("[v0] Credenciais Twilio Verify não configuradas")
      return NextResponse.json(
        { error: "Serviço de verificação não configurado" },
        { status: 500 },
      )
    }

    // Formatar telefone para formato internacional (+55 para Brasil)
    const formattedPhone = phone.startsWith("+") ? phone : `+55${phone}`

    // Criar autenticação básica para Twilio
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    // Enviar verificação via Twilio Verify Service
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedPhone,
          Channel: "sms",
        }).toString(),
      },
    )

    const data = await response.json()

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
    return NextResponse.json(
      { error: "Erro ao enviar código" },
      { status: 500 },
    )
  }
}
