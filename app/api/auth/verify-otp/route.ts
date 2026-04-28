import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// Store de OTP (seria melhor em Redis)
const otpStore = new Map<string, { code: string; expires: number }>()

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json()

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Telefone e código são obrigatórios" },
        { status: 400 },
      )
    }

    // Verificar se OTP existe e é válido
    const storedOTP = otpStore.get(phone)

    if (!storedOTP) {
      return NextResponse.json(
        { error: "Código expirado ou não encontrado" },
        { status: 400 },
      )
    }

    if (Date.now() > storedOTP.expires) {
      otpStore.delete(phone)
      return NextResponse.json(
        { error: "Código expirado" },
        { status: 400 },
      )
    }

    if (storedOTP.code !== code) {
      return NextResponse.json(
        { error: "Código inválido" },
        { status: 400 },
      )
    }

    // Código válido, criar sessão
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Buscar usuário pelo telefone
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .eq("phone", phone)
      .single()

    if (userError && userError.code !== "PGRST116") {
      console.error("Erro ao buscar usuário:", userError)
      return NextResponse.json(
        { error: "Erro ao processar login" },
        { status: 500 },
      )
    }

    // Se usuário existe, fazer login
    if (user) {
      // Criar sessão (seria melhor usar JWT/token)
      const cookieStore = cookies()
      cookieStore.set("phone_verified", phone, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 dias
      })

      // Limpar OTP
      otpStore.delete(phone)

      return NextResponse.json({
        success: true,
        userExists: true,
        message: "Login realizado com sucesso",
      })
    } else {
      // Novo usuário, armazenar telefone verificado temporariamente
      const cookieStore = cookies()
      cookieStore.set("phone_verified_temp", phone, {
        httpOnly: true,
        maxAge: 60 * 10, // 10 minutos
      })

      // Limpar OTP
      otpStore.delete(phone)

      return NextResponse.json({
        success: true,
        userExists: false,
        message: "Telefone verificado",
      })
    }
  } catch (error) {
    console.error("Erro na rota verify-otp:", error)
    return NextResponse.json(
      { error: "Erro ao verificar código" },
      { status: 500 },
    )
  }
}
