import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const DEPLOY_VERSION = "v11.0-SECURE-EMAIL-ONLY"

export async function POST(request: NextRequest) {
  try {
    console.log("[v11] 🚀 FORGOT PASSWORD API - " + DEPLOY_VERSION)

    const body = await request.json()
    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Email inválido." }, { status: 400 })
    }

    console.log("[v11] Password reset requested for:", email)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || "https://freejob-brasil.vercel.app"

    const { error: emailError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback`,
    })

    if (emailError) {
      console.error("[v11] Supabase email error:", emailError)
      return NextResponse.json(
        {
          success: false,
          message: "Erro ao enviar email. Por favor, verifique se o SMTP está configurado no Supabase.",
        },
        { status: 500 },
      )
    }

    console.log("[v11] ✅ Email sent successfully via Supabase")

    return NextResponse.json({
      success: true,
      message: "Se o email existir em nossa base, você receberá um link de recuperação em alguns minutos.",
    })
  } catch (error) {
    console.error("[v11] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro ao processar solicitação. Tente novamente.",
      },
      { status: 500 },
    )
  }
}
