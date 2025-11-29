import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

const DEPLOY_VERSION = "v7.0-EMAIL-SENDER"

export async function POST(request: NextRequest) {
  try {
    console.log("[v7] 🚀 FORGOT PASSWORD API - " + DEPLOY_VERSION)

    const body = await request.json()
    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, message: "Email inválido." }, { status: 400 })
    }

    console.log("[v7] Password reset requested for:", email)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: authUser, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) {
      console.error("[v7] Error listing users:", userError)
      return NextResponse.json({ success: false, message: "Erro ao verificar usuário." }, { status: 500 })
    }

    const user = authUser?.users.find((u) => u.email === email)

    if (!user) {
      console.log("[v7] User not found, returning generic success")
      return NextResponse.json({
        success: true,
        message: "Se o email existir em nossa base, você receberá um link para redefinir sua senha.",
      })
    }

    console.log("[v7] User found:", user.id)

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    const { error: insertError } = await supabase.rpc("create_password_reset_token", {
      p_user_id: user.id,
      p_token: token,
      p_expires_at: expiresAt.toISOString(),
    })

    if (insertError) {
      console.error("[v7] Token insert failed:", insertError.message)
      return NextResponse.json({ success: false, message: "Erro ao processar solicitação." }, { status: 500 })
    }

    console.log("[v7] Token created successfully")

    const baseUrl = "https://freejob-brasil.vercel.app"
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY || ""}`,
        },
        body: JSON.stringify({
          from: "Freejob <noreply@freejob-brasil.vercel.app>",
          to: email,
          subject: "Redefinição de Senha - Freejob",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .button { display: inline-block; background: #2563eb; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                  .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Redefinição de Senha</h1>
                  </div>
                  <div class="content">
                    <p>Olá,</p>
                    <p>Você solicitou a redefinição de senha da sua conta Freejob.</p>
                    <p>Clique no botão abaixo para criar uma nova senha:</p>
                    <p style="text-align: center;">
                      <a href="${resetUrl}" class="button">Redefinir Senha</a>
                    </p>
                    <p>Ou copie e cole este link no seu navegador:</p>
                    <p style="background: white; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">${resetUrl}</p>
                    <p><strong>Este link expira em 1 hora.</strong></p>
                    <p>Se você não solicitou esta redefinição, ignore este email.</p>
                  </div>
                  <div class="footer">
                    <p>© 2025 Freejob Brasil. Todos os direitos reservados.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        }),
      })

      if (emailResponse.ok) {
        console.log("[v7] ✅ Email sent successfully")
      } else {
        const errorText = await emailResponse.text()
        console.log("[v7] ⚠️ Email sending failed:", errorText)
      }
    } catch (emailError) {
      console.error("[v7] Email error:", emailError)
    }

    console.log("[v7] Reset URL:", resetUrl)

    return NextResponse.json({
      success: true,
      message: "Link de recuperação enviado para seu email!",
      resetUrl: resetUrl,
      token: token,
      email: email,
    })
  } catch (error) {
    console.error("[v7] Unexpected error:", error)
    return NextResponse.json({ success: false, message: "Erro ao processar solicitação." }, { status: 500 })
  }
}
