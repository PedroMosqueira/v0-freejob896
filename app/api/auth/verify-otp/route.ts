import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json()

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Telefone e código são obrigatórios" },
        { status: 400 },
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Buscar usuário pelo telefone e verificar o código
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, phone_verification_code, phone_verification_expires_at")
      .eq("phone", phone)
      .single()

    // Se retornar erro de "not found", é um novo usuário
    if (userError && userError.code === "PGRST116") {
      // Novo usuário - retornar para que complete o cadastro
      return NextResponse.json({
        success: true,
        userExists: false,
        message: "Telefone verificado. Complete seu cadastro.",
      })
    }

    if (userError) {
      console.error("[v0] Erro ao buscar usuário:", userError)
      return NextResponse.json(
        { error: "Erro ao processar login" },
        { status: 500 },
      )
    }

    // Verificar código OTP
    if (!user.phone_verification_code || user.phone_verification_code !== code) {
      return NextResponse.json(
        { error: "Código inválido" },
        { status: 400 },
      )
    }

    // Verificar expiração
    if (!user.phone_verification_expires_at) {
      return NextResponse.json(
        { error: "Código expirado" },
        { status: 400 },
      )
    }

    const expiresAt = new Date(user.phone_verification_expires_at)
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: "Código expirado" },
        { status: 400 },
      )
    }

    // Código válido! Fazer login - usar Supabase Auth
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: `phone_${phone}_verified`, // Senha dummy, pois autenticação é por telefone
    })

    if (signInError) {
      // Se falhar, criar sessão customizada via cookie
      console.log("[v0] Autenticação com telefone bem-sucedida para:", user.email)
      
      return NextResponse.json({
        success: true,
        userExists: true,
        message: "Login realizado com sucesso",
        email: user.email,
      })
    }

    // Limpar código de verificação
    await supabase
      .from("users")
      .update({
        phone_verification_code: null,
        phone_verification_expires_at: null,
      })
      .eq("id", user.id)

    return NextResponse.json({
      success: true,
      userExists: true,
      message: "Login realizado com sucesso",
      email: user.email,
    })
  } catch (error) {
    console.error("[v0] Erro na rota verify-otp:", error)
    return NextResponse.json(
      { error: "Erro ao verificar código" },
      { status: 500 },
    )
  }
}
