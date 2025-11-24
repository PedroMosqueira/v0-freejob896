import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Forgot password request received")

    const body = await request.json()
    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Email inválido." }, { status: 400 })
    }

    console.log("[v0] Requesting password reset for:", email)

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || process.env.NEXTAUTH_URL}/auth/reset-password`,
    })

    if (error) {
      console.log("[v0] Password reset error:", error.message)
      // Não revelar se o email existe ou não por segurança
      return NextResponse.json({
        success: true,
        message: "Se o email existir em nossa base, você receberá um link para redefinir sua senha.",
      })
    }

    console.log("[v0] Password reset email sent successfully")

    return NextResponse.json({
      success: true,
      message: "Email de recuperação enviado! Verifique sua caixa de entrada.",
    })
  } catch (error) {
    console.log("[v0] Unexpected error:", error)
    return NextResponse.json({ success: false, message: "Erro ao processar solicitação." }, { status: 500 })
  }
}
