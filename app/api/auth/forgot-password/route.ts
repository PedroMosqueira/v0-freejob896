import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const DEPLOY_VERSION = "v14.0-SIMPLIFIED"

export async function POST(request: NextRequest) {
  try {
    console.log("[v14] 🚀 FORGOT PASSWORD API - " + DEPLOY_VERSION)

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[v14] ❌ Failed to parse request body:", parseError)
      return NextResponse.json({ success: false, message: "Erro ao processar dados da solicitação." }, { status: 400 })
    }

    const { email } = body

    if (!email || !email.includes("@")) {
      console.log("[v14] ⚠️ Invalid email format:", email)
      return NextResponse.json({ success: false, message: "Email inválido." }, { status: 400 })
    }

    console.log("[v14] 📧 Password reset requested for:", email)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error("[v14] ❌ Missing Supabase environment variables")
      return NextResponse.json({ success: false, message: "Configuração incorreta do servidor." }, { status: 500 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    console.log("[v14] ✅ Supabase client created successfully")

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || "https://freejob-brasil.vercel.app"
    const redirectUrl = `${baseUrl}/auth/callback`

    console.log("[v14] 📤 Calling resetPasswordForEmail")
    console.log("[v14] Email:", email)
    console.log("[v14] RedirectTo:", redirectUrl)

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      console.error("[v14] ❌ Supabase email error:", error)
      console.error("[v14] Error code:", error.code)
      console.error("[v14] Error message:", error.message)

      return NextResponse.json(
        {
          success: false,
          message: "Erro ao enviar email. Verifique se o SMTP está configurado no Supabase Dashboard.",
          error: error.message,
        },
        { status: 500 },
      )
    }

    console.log("[v14] ✅ Email sent successfully!")
    console.log("[v14] Response data:", data)

    return NextResponse.json({
      success: true,
      message:
        "Se o email existir em nossa base, você receberá um link de recuperação em alguns minutos. Verifique também sua caixa de spam.",
    })
  } catch (error) {
    console.error("[v14] ❌ Unexpected error:")
    console.error("[v14] Error:", error)
    console.error("[v14] Error message:", error instanceof Error ? error.message : String(error))

    return NextResponse.json(
      {
        success: false,
        message: "Erro ao processar solicitação. Tente novamente.",
      },
      { status: 500 },
    )
  }
}
