import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const DEPLOY_VERSION = "v13.0-ERROR-DIAGNOSTICS"

export async function POST(request: NextRequest) {
  try {
    console.log("[v13] 🚀 FORGOT PASSWORD API - " + DEPLOY_VERSION)

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[v13] ❌ Failed to parse request body:", parseError)
      return NextResponse.json({ success: false, message: "Erro ao processar dados da solicitação." }, { status: 400 })
    }

    const { email } = body

    if (!email || !email.includes("@")) {
      console.log("[v13] ⚠️ Invalid email format:", email)
      return NextResponse.json({ success: false, message: "Email inválido." }, { status: 400 })
    }

    console.log("[v13] 📧 Password reset requested for:", email)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("[v13] ❌ Missing NEXT_PUBLIC_SUPABASE_URL")
      return NextResponse.json({ success: false, message: "Configuração incorreta do servidor." }, { status: 500 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[v13] ❌ Missing SUPABASE_SERVICE_ROLE_KEY")
      return NextResponse.json({ success: false, message: "Configuração incorreta do servidor." }, { status: 500 })
    }

    let supabase
    try {
      supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
      console.log("[v13] ✅ Supabase client created successfully")
    } catch (clientError) {
      console.error("[v13] ❌ Failed to create Supabase client:", clientError)
      return NextResponse.json(
        { success: false, message: "Erro ao conectar com o serviço de autenticação." },
        { status: 500 },
      )
    }

    let userData
    try {
      const result = await supabase.auth.admin.getUserByEmail(email)
      userData = result.data

      if (result.error) {
        console.log("[v13] ⚠️ Error getting user:", result.error)
      }

      if (!userData?.user) {
        console.log("[v13] ⚠️ User not found:", email)
        // Retorna sucesso mesmo se usuário não existe (segurança)
        return NextResponse.json({
          success: true,
          message: "Se o email existir em nossa base, você receberá um link de recuperação em alguns minutos.",
        })
      }

      console.log("[v13] ✅ User found:", userData.user.id)
    } catch (userError) {
      console.error("[v13] ❌ Exception getting user:", userError)
      // Retorna sucesso por segurança mesmo com erro
      return NextResponse.json({
        success: true,
        message: "Se o email existir em nossa base, você receberá um link de recuperação em alguns minutos.",
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || "https://freejob-brasil.vercel.app"
    const redirectUrl = `${baseUrl}/auth/callback`

    console.log("[v13] 📤 Calling resetPasswordForEmail")
    console.log("[v13] Email:", email)
    console.log("[v13] RedirectTo:", redirectUrl)

    let emailResult
    try {
      emailResult = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      console.log("[v13] Email result:", emailResult)
    } catch (emailException) {
      console.error("[v13] ❌ Exception calling resetPasswordForEmail:", emailException)
      return NextResponse.json(
        {
          success: false,
          message: "Erro ao enviar email. Tente novamente em alguns minutos.",
          error: String(emailException),
        },
        { status: 500 },
      )
    }

    if (emailResult.error) {
      console.error("[v13] ❌ Supabase email error:", emailResult.error)
      console.error("[v13] Error code:", emailResult.error.code)
      console.error("[v13] Error message:", emailResult.error.message)
      console.error("[v13] Error status:", emailResult.error.status)

      return NextResponse.json(
        {
          success: false,
          message:
            "Erro ao enviar email. O SMTP padrão do Supabase tem limitações. Configure um provedor SMTP customizado.",
          error: emailResult.error.message,
        },
        { status: 500 },
      )
    }

    console.log("[v13] ✅ Email sent successfully!")
    console.log("[v13] Response data:", emailResult.data)

    return NextResponse.json({
      success: true,
      message:
        "Email de recuperação enviado! Verifique sua caixa de entrada e spam. Se não receber em 5 minutos, solicite novamente.",
    })
  } catch (error) {
    console.error("[v13] ❌ Unexpected error in try-catch:")
    console.error("[v13] Error type:", typeof error)
    console.error("[v13] Error:", error)
    console.error("[v13] Error message:", error instanceof Error ? error.message : String(error))
    console.error("[v13] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        success: false,
        message: "Erro ao processar solicitação. Tente novamente.",
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
