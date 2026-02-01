import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Email inválido", error: "Invalid email format" },
        { status: 400 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { success: false, message: "Configuração incorreta do servidor", error: "Missing Supabase env vars" },
        { status: 500 }
      )
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Tentar enviar email de recuperação de senha como teste
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || "https://freejob-brasil.vercel.app"
    const redirectUrl = `${baseUrl}/auth/callback`

    console.log("[v0] Testing email send to:", email)
    console.log("[v0] Redirect URL:", redirectUrl)

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      console.error("[v0] Email send failed:", {
        message: error.message,
        code: error.code,
        status: error.status,
      })

      // Análise de erro específica
      let diagnosis = ""
      if (error.message.includes("rate limit") || error.message.includes("too many")) {
        diagnosis = "Rate limit atingido. Aguarde alguns minutos antes de tentar novamente."
      } else if (error.message.includes("SMTP") || error.message.includes("email")) {
        diagnosis = "Problema com configuração SMTP. Verifique as variáveis de ambiente do Supabase."
      } else if (error.message.includes("not found")) {
        diagnosis = "Email não encontrado no banco de dados."
      }

      return NextResponse.json({
        success: false,
        message: `Erro ao enviar email: ${error.message}`,
        diagnosis,
        error: error.message,
        code: error.code,
      })
    }

    console.log("[v0] Email test sent successfully")

    return NextResponse.json({
      success: true,
      message: "Email de teste enviado com sucesso! Verifique sua caixa de entrada.",
      diagnosis: "Email foi enviado corretamente. Se não recebeu, verifique a pasta de spam.",
    })
  } catch (error) {
    console.error("[v0] Unexpected error in test-email-send:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Erro inesperado ao enviar email de teste",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
