import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  console.log("[v0] 🔍 GET /api/auth/validate-reset-token called")

  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    console.log("[v0] Token received:", token ? "present" : "missing")

    if (!token) {
      console.log("[v0] ❌ No token provided")
      return NextResponse.json({ valid: false, message: "Token não fornecido" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log("[v0] 🔍 Searching for token in database...")
    const { data: resetToken, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("user_id, token, expires_at, used")
      .eq("token", token)
      .single()

    if (tokenError || !resetToken) {
      console.log("[v0] ❌ Token not found:", tokenError?.message)
      return NextResponse.json({ valid: false, message: "Token inválido" }, { status: 404 })
    }

    console.log("[v0] ✅ Token found in database")
    console.log("[v0] Token data:", {
      user_id: resetToken.user_id,
      expires_at: resetToken.expires_at,
      used: resetToken.used,
    })

    if (resetToken.used) {
      console.log("[v0] ❌ Token already used")
      return NextResponse.json({ valid: false, message: "Token já foi utilizado" }, { status: 400 })
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      console.log("[v0] ❌ Token expired")
      return NextResponse.json({ valid: false, message: "Token expirado" }, { status: 400 })
    }

    console.log("[v0] 🔍 Fetching user data from auth.users...")
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.getUserById(resetToken.user_id)

    if (userError || !user) {
      console.log("[v0] ❌ User not found:", userError?.message)
      return NextResponse.json({ valid: false, message: "Usuário não encontrado" }, { status: 404 })
    }

    console.log("[v0] ✅ User found:", user.email)
    console.log("[v0] ✅ Token validation successful")

    return NextResponse.json({
      valid: true,
      email: user.email,
    })
  } catch (error) {
    console.error("[v0] ❌ Validation error:", error)
    return NextResponse.json({ valid: false, message: "Erro ao validar token" }, { status: 500 })
  }
}
