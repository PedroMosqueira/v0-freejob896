import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"  // Importado aqui para uso posterior

export async function POST(request: NextRequest) {
  try {
    const { phone, firstName, lastName, email, userType } = await request.json()

    console.log("[v0] register-phone: Recebido", { phone, firstName, lastName, email, userType })

    // Validações
    if (!phone || !firstName || !lastName || !email) {
      console.error("[v0] Campos obrigatórios faltando")
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 },
      )
    }

    // Nota: O telefone já foi verificado na etapa anterior (verify-otp)
    // Não precisamos verificar cookie porque o usuário só chega aqui após validação do Twilio
    console.log("[v0] Telefone já validado via Twilio Verify")

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Gerar senha aleatória (login é por telefone, mas precisa de senha para auth)
    const tempPassword = Math.random().toString(36).slice(-12)

    // Criar usuário via Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: {
          phone,
          first_name: firstName,
          last_name: lastName,
        },
      },
    })

    if (authError) {
      console.error("[v0] Erro ao criar usuário:", authError)
      return NextResponse.json(
        { error: authError.message || "Erro ao registrar usuário" },
        { status: 400 },
      )
    }

    if (!authData.user) {
      console.error("[v0] Usuário não foi criado")
      return NextResponse.json(
        { error: "Erro ao criar usuário" },
        { status: 500 },
      )
    }

    console.log("[v0] Usuário criado no Auth com ID:", authData.user.id)

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
      phone_verified: true, // IMPORTANTE: Marcar como verificado
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error("[v0] Erro ao criar perfil:", profileError)
      return NextResponse.json(
        { error: "Erro ao criar perfil" },
        { status: 500 },
      )
    }

    console.log("[v0] Perfil de usuário criado com sucesso")

    // O usuário está automaticamente autenticado via signUp
    // Apenas retornamos sucesso
    return NextResponse.json({
      success: true,
      message: "Usuário registrado com sucesso",
      user: {
        id: authData.user.id,
        email,
        phone,
        phoneVerified: true,
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
