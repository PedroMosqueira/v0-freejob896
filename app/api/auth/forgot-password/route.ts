import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

const DEPLOY_VERSION = "v6.0-ALWAYS-RETURN-URL"

export async function POST(request: NextRequest) {
  try {
    console.log("[v6] ==========================================")
    console.log(`[v6] 🚀 FORGOT PASSWORD API - ${DEPLOY_VERSION}`)
    console.log("[v6] Forgot password request received")
    console.log("[v6] ==========================================")

    const body = await request.json()
    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Email inválido." }, { status: 400 })
    }

    console.log("[v6] Requesting password reset for:", email)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[v6] Looking up user...")
    const { data: authUser, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) {
      console.error("[v6] Error listing users:", userError)
      return NextResponse.json({ success: false, message: "Erro ao verificar usuário." }, { status: 500 })
    }

    console.log("[v6] Total users found:", authUser?.users.length)
    const user = authUser?.users.find((u) => u.email === email)

    if (!user) {
      console.log("[v6] User not found for email:", email)
      return NextResponse.json({
        success: true,
        message: "Se o email existir em nossa base, você receberá um link para redefinir sua senha.",
      })
    }

    console.log("[v6] User found! ID:", user.id, "Email:", user.email)

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    console.log("[v6] Generated token:", token)
    console.log("[v6] Token expires at:", expiresAt.toISOString())

    console.log("[v6] Attempting to insert token using RPC...")

    const { data: insertResult, error: insertError } = await supabase.rpc("create_password_reset_token", {
      p_user_id: user.id,
      p_token: token,
      p_expires_at: expiresAt.toISOString(),
    })

    if (insertError) {
      console.error("[v6] RPC INSERT ERROR:", insertError.message)
      console.log("[v6] RPC failed, trying direct insert...")

      const { data: directInsert, error: directError } = await supabase
        .from("password_reset_tokens")
        .insert({
          user_id: user.id,
          token: token,
          expires_at: expiresAt.toISOString(),
          used: false,
        })
        .select()

      if (directError) {
        console.error("[v6] DIRECT INSERT ERROR:", JSON.stringify(directError, null, 2))
        return NextResponse.json(
          {
            success: false,
            message: "Erro ao processar solicitação.",
          },
          { status: 500 },
        )
      }

      console.log("[v6] ✅ Direct insert succeeded!")
    } else {
      console.log("[v6] ✅ RPC insert succeeded!")
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://freejob-brasil.vercel.app"
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    console.log("[v6] ==========================================")
    console.log("[v6] 🔗 RESET LINK:", resetUrl)
    console.log("[v6] 🔑 TOKEN:", token)
    console.log("[v6] 📧 EMAIL:", email)
    console.log("[v6] ==========================================")

    return NextResponse.json({
      success: true,
      message: "Link de recuperação gerado!",
      resetUrl: resetUrl,
      token: token,
      email: email,
    })
  } catch (error) {
    console.error("[v6] UNEXPECTED ERROR:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro ao processar solicitação.",
      },
      { status: 500 },
    )
  }
}
