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
  message: string,
  countryCode: string = "+55"
): Promise<ZAPIResponse> {
  try {
    const zApiToken = process.env.Z_API_TOKEN
    const zApiInstanceId = process.env.Z_API_INSTANCE_ID

    if (!zApiToken || !zApiInstanceId) {
      console.error("[v0] Z-API: Credenciais não configuradas")
      return {
        success: false,
        error: "Z-API credentials not configured",
      }
    }

    const formattedPhone = formatPhoneForWhatsApp(phone, countryCode)
    console.log("[v0] Z-API: Enviando para", formattedPhone)

    const response = await fetch(
      `https://api.z-api.io/instances/${zApiInstanceId}/token/${zApiToken}/send-message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error("[v0] Z-API Error:", response.status, data)
      return {
        success: false,
        error: data.message || `Erro Z-API: ${response.status}`,
      }
    }

    console.log("[v0] Z-API: Mensagem enviada com sucesso!")
    return {
      success: true,
      id: data.messageId || data.id,
    }
  } catch (error: any) {
    console.error("[v0] Z-API Exception:", error.message)
    return {
      success: false,
      error: error.message,
    }
  }
}

function formatPhoneForWhatsApp(phone: string, countryCode: string = "+55"): string {
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, "")

  // Se já começa com 55, retorna como está
  if (cleaned.startsWith("55")) {
    console.log("[v0] Phone já tem código de país: " + cleaned)
    return cleaned
  }

  // Se tem 11 dígitos (começa com 0), assume que é número Brasil com 0
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    console.log("[v0] Phone formato com 0: " + cleaned + " -> " + ("55" + cleaned.substring(1)))
    return "55" + cleaned.substring(1)
  }

  // Remove o + do countryCode se houver
  const code = countryCode.replace("+", "")

  // Se tem 10 dígitos, adiciona o código do país
  if (cleaned.length === 10) {
    console.log("[v0] Phone formato 10 dígitos: " + cleaned + " -> " + (code + cleaned))
    return code + cleaned
  }

  // Se tem 11 dígitos sem o 0, já é DDD + 9XXXXXXXX
  if (cleaned.length === 11) {
    console.log("[v0] Phone formato 11 dígitos: " + cleaned + " -> " + (code + cleaned))
    return code + cleaned
  }

  // Fallback: retorna como está
  console.log("[v0] Phone formato desconhecido: " + cleaned)
  return cleaned
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function getVerificationMessage(code: string): string {
  return `Seu código de verificação FreeJob é: ${code}\n\nEste código expira em 10 minutos.`
}
