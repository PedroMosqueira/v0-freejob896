import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const DEPLOY_VERSION = "v12.0-SMTP-DIAGNOSTICS"

export async function POST(request: NextRequest) {
  try {
    console.log("[v12] 🚀 FORGOT PASSWORD API - " + DEPLOY_VERSION)

    const body = await request.json()
    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Email inválido." }, { status: 400 })
    }

    console.log("[v12] 📧 Password reset requested for:", email)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email)

    if (userError || !userData.user) {
      console.log("[v12] ⚠️ User not found:", email)
      // Retorna sucesso mesmo se usuário não existe (segurança)
      return NextResponse.json({
        success: true,
        message: "Se o email existir em nossa base, você receberá um link de recuperação em alguns minutos.",
      })
    }

    console.log("[v12] ✅ User found:", userData.user.id)

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || "https://freejob-brasil.vercel.app"

    console.log("[v12] 📤 Calling resetPasswordForEmail with redirectTo:", `${baseUrl}/auth/callback`)

    const { data, error: emailError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback`,
    })

    if (emailError) {
      console.error("[v12] ❌ Supabase email error:", emailError)
      console.error("[v12] Error details:", JSON.stringify(emailError, null, 2))

      return NextResponse.json(
        {
          success: false,
          message:
            "Erro ao enviar email. O SMTP padrão do Supabase tem limitações. Configure um provedor SMTP customizado no Dashboard do Supabase (Authentication > Email Templates > SMTP Settings).",
          error: emailError.message,
        },
        { status: 500 },
      )
    }

    console.log("[v12] ✅ resetPasswordForEmail called successfully")
    console.log("[v12] Response data:", data)
    console.log("[v12] ⚠️ IMPORTANTE: Se o email não chegar, configure SMTP customizado no Supabase Dashboard")
    console.log("[v12] O SMTP padrão do Supabase é apenas para demo e tem rate limits muito baixos")

    return NextResponse.json({
      success: true,
      message:
        "Email de recuperação enviado! Verifique sua caixa de entrada e spam. Se não receber em 5 minutos, solicite novamente.",
    })
  } catch (error) {
    console.error("[v12] ❌ Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro ao processar solicitação. Tente novamente.",
      },
      { status: 500 },
    )
  }
}
