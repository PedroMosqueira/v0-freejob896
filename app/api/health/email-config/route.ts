import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * Health check endpoint para verificar se o email está funcionando
 * GET /api/health/email-config - Status básico
 * POST /api/health/email-config - Teste completo
 */

export async function GET() {
  try {
    const checks = {
      env_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      env_supabase_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      env_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      env_smtp_config: !!process.env.SUPABASE_SMTP_HOST,
    }

    const allConfigured = Object.values(checks).every((v) => v)

    return NextResponse.json({
      status: allConfigured ? "configured" : "incomplete",
      checks,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, testType = "resend" } = await request.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Email inválido" }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { success: false, error: "Supabase não configurado" },
        { status: 500 }
      )
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log(`[v0] Testing email send (${testType}) to:`, email)

    // Teste 1: Enviar email de recuperação de senha
    if (testType === "resend" || testType === "all") {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || "https://freejob-brasil.vercel.app"

      const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/callback`,
      })

      if (resetError) {
        console.error("[v0] Reset email error:", resetError.message)

        return NextResponse.json({
          success: false,
          testType: "resend",
          error: resetError.message,
          code: resetError.code,
          diagnosis: getDiagnosis(resetError.message),
        })
      }

      console.log("[v0] Reset email sent successfully")

      return NextResponse.json({
        success: true,
        testType: "resend",
        message: "Email enviado com sucesso",
        diagnosis: "SMTP está funcionando corretamente.",
      })
    }

    return NextResponse.json({
      success: false,
      error: "Test type não suportado",
    })
  } catch (error) {
    console.error("[v0] Email health check error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

function getDiagnosis(errorMessage: string): string {
  if (errorMessage.includes("rate limit") || errorMessage.includes("too many")) {
    return "Rate limit atingido. Aguarde alguns minutos."
  }
  if (errorMessage.includes("SMTP") || errorMessage.includes("smtp")) {
    return "Problema com SMTP. Verifique a configuração no Supabase Dashboard."
  }
  if (errorMessage.includes("not found")) {
    return "Email não encontrado."
  }
  if (errorMessage.includes("invalid") || errorMessage.includes("Invalid")) {
    return "Email inválido ou configuração inválida."
  }
  return "Verifique a configuração SMTP no Supabase Dashboard."
}
