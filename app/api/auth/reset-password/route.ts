import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Reset password request received")

    const body = await request.json()
    const { password, confirmPassword } = body

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, message: "A senha deve ter pelo menos 8 caracteres." },
        { status: 400 },
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ success: false, message: "As senhas não coincidem." }, { status: 400 })
    }

    console.log("[v0] Updating password...")

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      console.log("[v0] Password update error:", error.message)
      return NextResponse.json(
        { success: false, message: "Erro ao redefinir senha. O link pode ter expirado." },
        { status: 400 },
      )
    }

    console.log("[v0] Password updated successfully")

    return NextResponse.json({
      success: true,
      message: "Senha redefinida com sucesso!",
    })
  } catch (error) {
    console.log("[v0] Unexpected error:", error)
    return NextResponse.json({ success: false, message: "Erro ao processar solicitação." }, { status: 500 })
  }
}
