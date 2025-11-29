import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

const DEPLOY_VERSION = "v4.0-FORCE-REBUILD-NOW"

export async function POST(request: NextRequest) {
  try {
    console.log("[v4] ==========================================")
    console.log(`[v4] 🚀 FORGOT PASSWORD API - ${DEPLOY_VERSION}`)
    console.log("[v4] Forgot password request received")
    console.log("[v4] ==========================================")

    const body = await request.json()
    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Email inválido." }, { status: 400 })
    }

    console.log("[v4] Requesting password reset for:", email)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[v4] Testing table access...")
    const { data: testData, error: testError } = await supabase.from("password_reset_tokens").select("count").limit(1)

    console.log("[v4] Table access test result:", { testData, testError })

    console.log("[v4] Looking up user...")
    const { data: authUser, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) {
      console.error("[v4] Error listing users:", userError)
      return NextResponse.json({ success: false, message: "Erro ao verificar usuário." }, { status: 500 })
    }

    console.log("[v4] Total users found:", authUser?.users.length)
    const user = authUser?.users.find((u) => u.email === email)

    if (!user) {
      console.log("[v4] User not found for email:", email)
      return NextResponse.json({
        success: true,
        message: "Se o email existir em nossa base, você receberá um link para redefinir sua senha.",
      })
    }

    console.log("[v4] User found! ID:", user.id, "Email:", user.email)

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    console.log("[v4] Generated token:", token)
    console.log("[v4] Token expires at:", expiresAt.toISOString())

    console.log("[v4] Attempting to insert token using RPC...")

    const { data: insertResult, error: insertError } = await supabase.rpc("create_password_reset_token", {
      p_user_id: user.id,
      p_token: token,
      p_expires_at: expiresAt.toISOString(),
    })

    if (insertError) {
      console.error("[v4] ========== RPC INSERT ERROR ==========")
      console.error("[v4] Error code:", insertError.code)
      console.error("[v4] Error message:", insertError.message)
      console.error("[v4] Error details:", insertError.details)
      console.error("[v4] Error hint:", insertError.hint)
      console.error("[v4] =====================================")

      // Fallback to direct insert if RPC doesn't exist
      console.log("[v4] RPC failed, trying direct insert...")
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
        console.error("[v4] ========== DIRECT INSERT ERROR ==========")
        console.error("[v4] Error:", JSON.stringify(directError, null, 2))
        console.error("[v4] ===========================================")
        return NextResponse.json(
          {
            success: false,
            message: "Erro ao processar solicitação. Verifique os logs do servidor.",
            errorDetails: {
              code: directError.code,
              message: directError.message,
              details: directError.details,
            },
          },
          { status: 500 },
        )
      }

      console.log("[v4] ✅ Direct insert succeeded:", directInsert)
    } else {
      console.log("[v4] ✅ RPC insert succeeded:", insertResult)
    }

    const { data: verifyToken, error: verifyError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .single()

    console.log("[v4] Verification check:", { verifyToken, verifyError })

    if (verifyError || !verifyToken) {
      console.error("[v4] ========== VERIFICATION FAILED ==========")
      console.error("[v4] Token was not found after insert!")
      console.error("[v4] Verify error:", verifyError)
      console.error("[v4] ============================================")
      return NextResponse.json(
        {
          success: false,
          message: "Erro: Token não foi salvo corretamente.",
        },
        { status: 500 },
      )
    }

    console.log("[v4] ✅ Token verified in database!")
    console.log("[v4] =====================================")

    const baseUrl = process.env.NEXTAUTH_URL || "https://freejob-brasil.vercel.app"
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    console.log("[v4] ==========================================")
    console.log("[v4] 🔗 RESET LINK:", resetUrl)
    console.log("[v4] 🔑 TOKEN:", token)
    console.log("[v4] 📧 EMAIL:", email)
    console.log("[v4] 📋 COPY THIS LINK TO TEST!")
    console.log("[v4] ==========================================")

    const isDevelopment = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"

    return NextResponse.json({
      success: true,
      message: "Link de recuperação gerado!",
      resetUrl: isDevelopment ? resetUrl : undefined,
      token: isDevelopment ? token : undefined,
      email: email, // Always return email so frontend can display it
    })
  } catch (error) {
    console.error("[v4] ========== UNEXPECTED ERROR ==========")
    console.error("[v4]", error)
    console.error("[v4] ======================================")
    return NextResponse.json(
      {
        success: false,
        message: "Erro ao processar solicitação.",
        debug: process.env.NODE_ENV === "development" ? { error: String(error) } : undefined,
      },
      { status: 500 },
    )
  }
}
