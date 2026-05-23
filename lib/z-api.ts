// Z-API WhatsApp Integration
// Documentação: https://z-api.io/

export interface ZAPIMessage {
  phone: string
  message: string
}

export interface ZAPIResponse {
  success: boolean
  message?: string
  id?: string
  error?: string
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<ZAPIResponse> {
  try {
    const zApiToken = process.env.Z_API_TOKEN
    const zApiInstanceId = process.env.Z_API_INSTANCE_ID

    console.log("[v0] === Z-API sendWhatsAppMessage ===")
    console.log("[v0] Token configurado:", !!zApiToken)
    console.log("[v0] Instance ID configurado:", !!zApiInstanceId)

    if (!zApiToken || !zApiInstanceId) {
      console.error("[v0] Z-API credentials not configured")
      throw new Error("Z-API credentials not configured")
    }

    // Formatar telefone para formato internacional (55 + DDD + 9XXXXXXXX)
    const formattedPhone = formatPhoneForWhatsApp(phone)

    console.log("[v0] Enviando para Z-API:")
    console.log("[v0]   Phone original:", phone)
    console.log("[v0]   Phone formatado:", formattedPhone)
    console.log("[v0]   Mensagem:", message.substring(0, 50) + "...")

    const url = `https://api.z-api.io/instances/${zApiInstanceId}/token/${zApiToken}/send-message`
    console.log("[v0]   URL:", url)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
      }),
    })

    console.log("[v0] Z-API Response Status:", response.status, response.statusText)

    const data = await response.json()
    console.log("[v0] Z-API Response Data:", JSON.stringify(data).substring(0, 200))

    if (!response.ok) {
      console.error("[v0] Z-API Error:", data)
      return {
        success: false,
        error: data.message || "Erro ao enviar mensagem",
      }
    }

    return {
      success: true,
      id: data.messageId || data.id,
      message: "Mensagem enviada com sucesso",
    }
  } catch (error: any) {
    console.error("[v0] Erro ao enviar via Z-API:", error)
    return {
      success: false,
      error: error.message || "Erro ao enviar mensagem",
    }
  }
}

function formatPhoneForWhatsApp(phone: string): string {
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, "")

  // Se tem 11 dígitos (começa com 0), assume que é número Brasil com 0
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return "55" + cleaned.substring(1)
  }

  // Se tem 10 dígitos, adiciona 55 (Brasil)
  if (cleaned.length === 10) {
    return "55" + cleaned
  }

  // Se tem 11 dígitos sem o 0, já é DDD + 9XXXXXXXX
  if (cleaned.length === 11) {
    return "55" + cleaned
  }

  // Se já tem país code, retorna como está
  if (cleaned.startsWith("55")) {
    return cleaned
  }

  // Fallback: adiciona 55
  return "55" + cleaned
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function getVerificationMessage(code: string): string {
  return `Seu código de verificação FreeJob é: ${code}\n\nEste código expira em 10 minutos.`
}
