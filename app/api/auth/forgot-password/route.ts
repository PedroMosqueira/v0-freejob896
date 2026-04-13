import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const DEPLOY_VERSION = "v14.0-SIMPLIFIED"

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[v14] ❌ Failed to parse request body:", parseError)
      return NextResponse.json({ success: false, message: "Erro ao processar dados da solicitação." }, { status: 400 })
    }

    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Email inválido." }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error("[v14] ❌ Missing Supabase environment variables")
      return NextResponse.json({ success: false, message: "Configuração incorreta do servidor." }, { status: 500 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Usar HTTPS obrigatoriamente com o domínio correto
    const redirectUrl = "https://freejob.online/auth/callback"

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      console.error("[v14] ❌ Supabase email error:", error)

      return NextResponse.json(
        {
          success: false,
          message: "Erro ao enviar email. Verifique se o SMTP está configurado no Supabase Dashboard.",
          error: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message:
        "Se o email existir em nossa base, você receberá um link de recuperação em alguns minutos. Verifique também sua caixa de spam.",
    })
  } catch (error) {
    console.error("[v14] ❌ Unexpected error:")
    console.error("[v14] Error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Erro ao processar solicitação. Tente novamente.",
      },
      { status: 500 },
    )
  }
}
