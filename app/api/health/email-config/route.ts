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

    console.log("[v0] ========== INICIANDO DIAGNÓSTICO DE EMAIL ==========")
    console.log("[v0] Timestamp:", new Date().toISOString())
    console.log("[v0] Email para teste:", email)
    console.log("[v0] Tipo de teste:", testType)

    if (!email || !email.includes("@")) {
      console.error("[v0] ERRO: Email inválido fornecido")
      return NextResponse.json({ success: false, error: "Email inválido" }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("[v0] ERRO: NEXT_PUBLIC_SUPABASE_URL não está definida")
      return NextResponse.json(
        { success: false, error: "Supabase não configurado", details: "NEXT_PUBLIC_SUPABASE_URL ausente" },
        { status: 500 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("[v0] ERRO: NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida")
      return NextResponse.json(
        { success: false, error: "Supabase não configurado", details: "NEXT_PUBLIC_SUPABASE_ANON_KEY ausente" },
        { status: 500 }
      )
    }

    console.log("[v0] ✓ Supabase URL configurada")
    console.log("[v0] ✓ Supabase Anon Key configurada")

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[v0] ✓ Cliente Supabase criado com sucesso")

    // Teste 1: Enviar email de recuperação de senha
    if (testType === "resend" || testType === "all") {
      const baseUrl = "https://freejob.online"
      console.log("[v0] Base URL para redirecionamento:", baseUrl)

      console.log("[v0] Iniciando resetPasswordForEmail...")
      const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/callback`,
      })

      if (resetError) {
        console.error("[v0] ❌ ERRO ao enviar email:")
        console.error("[v0]   Mensagem:", resetError.message)
        console.error("[v0]   Código:", resetError.code)
        console.error("[v0]   Status:", resetError.status)
        console.error("[v0]   Nome:", resetError.name)
        console.error("[v0]   Objeto completo:", JSON.stringify(resetError, null, 2))

        const diagnosis = getDiagnosis(resetError.message, resetError.code, resetError.status)
        console.error("[v0]   Diagnóstico:", diagnosis)

        return NextResponse.json({
          success: false,
          testType: "resend",
          error: resetError.message,
          code: resetError.code,
          status: resetError.status,
          name: resetError.name,
          diagnosis: diagnosis,
          suggestedAction: getSuggestedAction(resetError.message, resetError.code),
          timestamp: new Date().toISOString(),
        })
      }

      console.log("[v0] ✅ Email enviado com sucesso!")
      console.log("[v0] Dados retornados:", resetData)

      return NextResponse.json({
        success: true,
        testType: "resend",
        message: "Email enviado com sucesso",
        diagnosis: "SMTP está funcionando corretamente.",
        timestamp: new Date().toISOString(),
      })
    }

    console.error("[v0] Tipo de teste não suportado:", testType)
    return NextResponse.json({
      success: false,
      error: "Test type não suportado",
    })
  } catch (error) {
    console.error("[v0] ❌ ERRO NÃO TRATADO no email health check:")
    console.error("[v0]   Tipo:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("[v0]   Mensagem:", error instanceof Error ? error.message : String(error))
    console.error("[v0]   Stack:", error instanceof Error ? error.stack : "N/A")
    console.error("[v0]   Objeto completo:", JSON.stringify(error, null, 2))

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

function getDiagnosis(errorMessage: string, errorCode?: string, errorStatus?: number): string {
  console.log("[v0] Analisando erro para diagnóstico:", { errorMessage, errorCode, errorStatus })

  if (errorMessage.includes("rate limit") || errorMessage.includes("too many") || errorStatus === 429) {
    return "RATE LIMIT: Você atingiu o limite de requisições. Aguarde alguns minutos antes de tentar novamente. No Resend, o limite é 100 emails/dia no plano grátis."
  }

  if (errorMessage.includes("SMTP") || errorMessage.includes("smtp")) {
    return "ERRO SMTP: Problema na configuração SMTP. Verifique: 1) SUPABASE_SMTP_HOST, 2) SUPABASE_SMTP_PORT, 3) SUPABASE_SMTP_USER, 4) SUPABASE_SMTP_PASS no Supabase Dashboard."
  }

  if (errorMessage.includes("not found") || errorCode === "user_not_found") {
    return "USUÁRIO NÃO ENCONTRADO: O email fornecido não existe no banco de dados. Registre-se primeiro."
  }

  if (errorMessage.includes("invalid") || errorMessage.includes("Invalid") || errorStatus === 400) {
    return "EMAIL/CONFIGURAÇÃO INVÁLIDA: Verifique se o email tem formato válido e se as configurações do Supabase estão corretas."
  }

  if (errorMessage.includes("already") || errorMessage.includes("duplicate")) {
    return "EMAIL DUPLICADO: Este email já foi registrado no sistema."
  }

  if (errorMessage.includes("permission") || errorStatus === 403) {
    return "ERRO DE PERMISSÃO: Verifique as configurações RLS no Supabase ou se a API Key tem permissões suficientes."
  }

  if (errorMessage.includes("network") || errorMessage.includes("connection") || errorMessage.includes("timeout")) {
    return "ERRO DE CONEXÃO: Problema de rede ao conectar com Supabase ou Resend. Verifique sua internet ou tente novamente."
  }

  if (errorStatus === 500) {
    return "ERRO DO SERVIDOR: Problema no servidor do Supabase. Tente novamente em alguns minutos."
  }

  return `ERRO DESCONHECIDO: "${errorMessage}". Verifique os logs do Supabase Dashboard para mais detalhes.`
}

function getSuggestedAction(errorMessage: string, errorCode?: string): string {
  if (errorMessage.includes("rate limit") || errorMessage.includes("too many")) {
    return "Aguarde 1-2 horas e tente novamente. Ou use um email diferente."
  }
  if (errorMessage.includes("not found")) {
    return "Registre-se primeiro antes de tentar recuperar a senha."
  }
  if (errorMessage.includes("SMTP")) {
    return "Contate o administrador do Supabase para revisar a configuração SMTP."
  }
  return "Tente novamente em alguns minutos ou use um email diferente."
}
