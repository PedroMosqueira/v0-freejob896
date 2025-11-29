import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Reset password request received")

    const body = await request.json()
    const { password, token } = body

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, message: "A senha deve ter pelo menos 8 caracteres." },
        { status: 400 },
      )
    }

    if (!token) {
      return NextResponse.json({ success: false, message: "Token de recuperação não fornecido." }, { status: 400 })
    }

    console.log("[v0] Validating reset token...")

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: resetToken, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .single()

    if (tokenError || !resetToken) {
      console.log("[v0] Invalid or used token:", tokenError)
      return NextResponse.json({ success: false, message: "Token inválido ou já utilizado." }, { status: 400 })
    }

    // Check if token expired
    const expiresAt = new Date(resetToken.expires_at)
    if (expiresAt < new Date()) {
      console.log("[v0] Token expired")
      return NextResponse.json(
        { success: false, message: "Link de recuperação expirado. Solicite um novo." },
        { status: 400 },
      )
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(resetToken.user_id)

    if (userError || !userData) {
      console.error("[v0] Error fetching user:", userError)
      return NextResponse.json({ success: false, message: "Usuário não encontrado." }, { status: 404 })
    }

    console.log("[v0] Token valid, updating password for user:", userData.user.email)

    const { error: updateError } = await supabase.auth.admin.updateUserById(resetToken.user_id, {
      password: password,
    })

    if (updateError) {
      console.error("[v0] Error updating password:", updateError)
      return NextResponse.json({ success: false, message: "Erro ao atualizar senha." }, { status: 500 })
    }

    // Mark token as used
    await supabase.from("password_reset_tokens").update({ used: true }).eq("token", token)

    console.log("[v0] Password updated successfully")

    return NextResponse.json({
      success: true,
      message: "Senha redefinida com sucesso!",
    })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ success: false, message: "Erro ao processar solicitação." }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] ==========================================")
    console.log("[v0] GET /api/auth/reset-password called")
    console.log("[v0] ==========================================")

    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    console.log("[v0] Token received:", token)

    if (!token) {
      console.log("[v0] No token provided")
      return NextResponse.json({ success: false, message: "Token não fornecido." }, { status: 400 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[v0] Querying password_reset_tokens table...")
    const { data: resetToken, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .single()

    console.log("[v0] Query result:", { resetToken, tokenError })

    if (tokenError || !resetToken) {
      console.log("[v0] Token not found or error:", tokenError?.message)
      return NextResponse.json({ success: false, valid: false }, { status: 200 })
    }

    const expiresAt = new Date(resetToken.expires_at)
    const now = new Date()
    console.log("[v0] Token expires at:", expiresAt)
    console.log("[v0] Current time:", now)
    console.log("[v0] Is expired:", expiresAt < now)

    if (expiresAt < now) {
      console.log("[v0] Token expired")
      return NextResponse.json({ success: false, valid: false, message: "Token expirado" }, { status: 200 })
    }

    console.log("[v0] Fetching user data for user_id:", resetToken.user_id)
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(resetToken.user_id)

    console.log("[v0] User data result:", { email: userData?.user?.email, error: userError })

    if (userError || !userData) {
      console.log("[v0] User not found or error:", userError?.message)
      return NextResponse.json({ success: false, valid: false }, { status: 200 })
    }

    console.log("[v0] ✅ Returning valid token with email:", userData.user.email)
    console.log("[v0] ==========================================")

    return NextResponse.json({
      success: true,
      valid: true,
      email: userData.user.email,
    })
  } catch (error) {
    console.error("[v0] ❌ Error validating token:", error)
    return NextResponse.json({ success: false, valid: false }, { status: 500 })
  }
}
