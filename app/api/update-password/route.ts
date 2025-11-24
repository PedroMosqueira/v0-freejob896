import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail } from "@/lib/auth-users"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [API] Password change request received")

    const body = await request.json()
    const { email, currentPassword, newPassword, confirmNewPassword } = body

    console.log("📧 [API] Email:", email)
    console.log("🔑 [API] Has current password:", !!currentPassword)
    console.log("🆕 [API] Has new password:", !!newPassword)
    console.log("✅ [API] Has confirm password:", !!confirmNewPassword)

    if (!email) {
      console.log("❌ [API] Email missing")
      return NextResponse.json({ success: false, message: "Email não encontrado." }, { status: 400 })
    }

    if (newPassword !== confirmNewPassword) {
      console.log("❌ [API] Password confirmation mismatch")
      return NextResponse.json(
        { success: false, message: "A nova senha e a confirmação não conferem." },
        { status: 400 },
      )
    }

    if (newPassword.length < 8) {
      console.log("❌ [API] Password too short")
      return NextResponse.json(
        { success: false, message: "A nova senha deve ter pelo menos 8 caracteres." },
        { status: 400 },
      )
    }

    console.log("👤 [API] Looking up user...")
    const user = await getUserByEmail(email)
    if (!user) {
      console.log("❌ [API] User not found")
      return NextResponse.json({ success: false, message: "Usuário não encontrado." }, { status: 404 })
    }
    console.log("✅ [API] User found:", user.id)

    console.log("🔐 [API] Verifying current password with Supabase Auth...")
    const supabase = await createSupabaseServerClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: currentPassword,
    })

    if (signInError) {
      console.log("❌ [API] Current password incorrect")
      return NextResponse.json({ success: false, message: "Senha atual incorreta." }, { status: 400 })
    }
    console.log("✅ [API] Current password verified")

    console.log("🔄 [API] Updating password with Supabase Auth...")
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.log("❌ [API] Password update failed:", updateError.message)
      return NextResponse.json({ success: false, message: "Falha ao atualizar senha." }, { status: 500 })
    }

    console.log("🎉 [API] Password updated successfully!")
    return NextResponse.json({ success: true, message: "Senha atualizada com sucesso." })
  } catch (error) {
    console.log("💥 [API] Unexpected error:", error)
    return NextResponse.json({ success: false, message: "Erro interno do servidor." }, { status: 500 })
  }
}
