import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

const DEPLOY_VERSION = "v10.0-ADD-DIAGNOSTICS-AND-FALLBACK"

export async function POST(request: NextRequest) {
  try {
    console.log("[v10] 🚀 FORGOT PASSWORD API - " + DEPLOY_VERSION)

    const body = await request.json()
    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Email inválido." }, { status: 400 })
    }

    console.log("[v10] Password reset requested for:", email)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single()

    if (userError || !user) {
      console.log("[v10] User not found, but returning success for security")
      return NextResponse.json({
        success: true,
        message: "Se o email existir em nossa base, você receberá um link para redefinir sua senha.",
      })
    }

    console.log("[v10] User found, ID:", user.id)

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 3600000).toISOString() // 1 hora

    const { error: tokenError } = await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      token: token,
      expires_at: expiresAt,
      used: false,
    })

    if (tokenError) {
      console.error("[v10] Error creating token:", tokenError)
      throw new Error("Erro ao criar token de recuperação")
    }

    console.log("[v10] ✅ Token created successfully")

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || "https://freejob-brasil.vercel.app"
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    console.log("[v10] Reset URL:", resetUrl)

    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: user.id,
      type: "password_reset",
      title: "Redefinir Senha",
      message: `Clique no link para redefinir sua senha: ${resetUrl}`,
      is_read: false,
    })

    if (notifError) {
      console.error("[v10] Error creating notification:", notifError)
    } else {
      console.log("[v10] ✅ Notification created successfully")
    }

    const { error: emailError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback`,
    })

    if (emailError) {
      console.log("[v10] Supabase email sending failed (expected if SMTP not configured):", emailError.message)
    } else {
      console.log("[v10] Supabase email sent successfully")
    }

    return NextResponse.json({
      success: true,
      message: "Link de recuperação gerado! Copie o link abaixo ou verifique suas notificações.",
      resetUrl: resetUrl,
      showInNotifications: true,
    })
  } catch (error) {
    console.error("[v10] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro ao processar solicitação. Tente novamente.",
      },
      { status: 500 },
    )
  }
}
