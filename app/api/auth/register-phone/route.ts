import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { phone, firstName, lastName, email, userType } = await request.json()

    // Validações
    if (!phone || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 },
      )
    }

    // Verificar se telefone foi verificado
    const cookieStore = cookies()
    const verifiedPhone = cookieStore.get("phone_verified_temp")?.value

    if (verifiedPhone !== phone) {
      return NextResponse.json(
        { error: "Telefone não foi verificado" },
        { status: 400 },
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Criar usuário via Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: Math.random().toString(36).slice(-12), // Gerar senha aleatória (login é por telefone)
      options: {
        data: {
          phone,
          first_name: firstName,
          last_name: lastName,
        },
      },
    })

    if (authError) {
      console.error("Erro ao criar usuário:", authError)
      return NextResponse.json(
        { error: authError.message || "Erro ao registrar usuário" },
        { status: 400 },
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Erro ao criar usuário" },
        { status: 500 },
      )
    }

    // Criar perfil do usuário
    const isRequester = userType === "service" || userType === "both"
    const isProfessional = userType === "professional" || userType === "both"

    const { error: profileError } = await supabase.from("users").insert({
      id: authData.user.id,
      email,
      phone,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      is_client: isRequester,
      is_professional: isProfessional,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error("Erro ao criar perfil:", profileError)
      return NextResponse.json(
        { error: "Erro ao criar perfil" },
        { status: 500 },
      )
    }

    // Criar sessão autenticada
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password: authData.user.user_metadata.password || "",
    })

    // Limpar cookie temporário
    cookieStore.delete("phone_verified_temp")

    // Definir cookie de sessão
    if (sessionData.session) {
      cookieStore.set("auth-token", sessionData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Usuário registrado com sucesso",
      user: {
        id: authData.user.id,
        email,
        phone,
      },
    })
  } catch (error) {
    console.error("Erro na rota register-phone:", error)
    return NextResponse.json(
      { error: "Erro ao registrar usuário" },
      { status: 500 },
    )
  }
}
