import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const DEPLOY_VERSION = "v8.0-SUPABASE-NATIVE"

export async function POST(request: NextRequest) {
  try {
    console.log("[v8] 🚀 FORGOT PASSWORD API - " + DEPLOY_VERSION)

    const body = await request.json()
    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Email inválido." }, { status: 400 })
    }

    console.log("[v8] Password reset requested for:", email)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // URL de redirecionamento após o reset
    const redirectTo = `${process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || "https://freejob-brasil.vercel.app"}/auth/reset-password`

    // Método nativo do Supabase que envia email automaticamente
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    })

    if (error) {
      console.error("[v8] Supabase resetPasswordForEmail error:", error.message)

      // Mesmo com erro, retornamos sucesso por segurança (não revelar se email existe)
      return NextResponse.json({
        success: true,
        message: "Se o email existir em nossa base, você receberá um link para redefinir sua senha.",
      })
    }

    console.log("[v8] ✅ Password reset email sent successfully via Supabase Auth")

    return NextResponse.json({
      success: true,
      message: "Email de recuperação enviado! Verifique sua caixa de entrada e spam.",
    })
  } catch (error) {
    console.error("[v8] Unexpected error:", error)
    return NextResponse.json(
      {
        success: true,
        message: "Se o email existir em nossa base, você receberá um link para redefinir sua senha.",
      },
      { status: 200 },
    )
  }
}
