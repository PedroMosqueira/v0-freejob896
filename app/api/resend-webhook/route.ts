// app/api/resend-webhook/route.ts
// Webhook para receber eventos do Resend e registrar logs detalhados

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Tipos de eventos do Resend
interface ResendEvent {
  type: "email.sent" | "email.bounced" | "email.complained" | "email.failed" | "email.delivered" | "email.clicked" | "email.opened"
  created_at: string
  data: {
    email_id: string
    from: string
    to: string
    subject?: string
    message?: string
    reason?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ========== WEBHOOK RESEND RECEBIDO ==========")
    console.log("[v0] Timestamp:", new Date().toISOString())

    const body = (await request.json()) as ResendEvent

    console.log("[v0] Tipo de evento:", body.type)
    console.log("[v0] Email ID:", body.data.email_id)
    console.log("[v0] De:", body.data.from)
    console.log("[v0] Para:", body.data.to)
    console.log("[v0] Criado em:", body.data.created_at)

    // Processar diferentes tipos de eventos
    switch (body.type) {
      case "email.sent":
        console.log("[v0] ✅ EMAIL ENVIADO COM SUCESSO")
        console.log("[v0] Email foi aceito pelo provedor de email")
        break

      case "email.delivered":
        console.log("[v0] 📬 EMAIL ENTREGUE")
        console.log("[v0] Email chegou na caixa de entrada do destinatário")
        break

      case "email.bounced":
        console.log("[v0] ⚠️ EMAIL REJEITADO (BOUNCE)")
        console.log("[v0] Razão:", body.data.reason || "Desconhecida")
        console.log("[v0] Possíveis motivos:")
        console.log("[v0]   - Email de destino não existe")
        console.log("[v0]   - Domínio de destino não existe")
        console.log("[v0]   - Servidor de destino rejeitou temporariamente")
        console.log("[v0]   - Email está na lista negra")
        break

      case "email.complained":
        console.log("[v0] 🚨 EMAIL MARCADO COMO SPAM")
        console.log("[v0] Destinatário marcou como spam/reclamação")
        break

      case "email.failed":
        console.log("[v0] ❌ FALHA NO ENVIO DO EMAIL")
        console.log("[v0] Razão:", body.data.reason || "Desconhecida")
        console.log("[v0] Possíveis motivos:")
        console.log("[v0]   - Erro temporário no Resend")
        console.log("[v0]   - Serviço de email indisponível")
        console.log("[v0]   - Limite de taxa atingido")
        console.log("[v0]   - Configuração SMTP incorreta")
        break

      case "email.opened":
        console.log("[v0] 👁️ EMAIL ABERTO")
        console.log("[v0] Destinatário abriu o email")
        break

      case "email.clicked":
        console.log("[v0] 🖱️ LINK CLICADO")
        console.log("[v0] Destinatário clicou em um link no email")
        break

      default:
        console.log("[v0] ❓ Tipo de evento desconhecido:", body.type)
    }

    console.log("[v0] ✅ Webhook processado com sucesso")
    return NextResponse.json({ success: true, received: true })
  } catch (error) {
    console.error("[v0] ❌ ERRO ao processar webhook:")
    console.error("[v0] Tipo:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("[v0] Mensagem:", error instanceof Error ? error.message : String(error))

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
