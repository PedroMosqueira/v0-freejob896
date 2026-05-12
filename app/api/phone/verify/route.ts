import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { phone, code, email } = await request.json()

    if (!phone || !code || !email) {
      return NextResponse.json(
        { message: "Telefone, código e email são obrigatórios" },
        { status: 400 }
      )
    }

    console.log("[v0] Verificando código para:", phone, "email:", email)

    // Criar cliente Supabase com service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    )

    // Buscar o usuário
    const { data: user, error: selectError } = await supabase
      .from("users")
      .select("phone_verification_code, phone_verification_expires_at, phone_verified")
      .eq("email", email)
      .single()

    if (selectError || !user) {
      console.log("[v0] Usuário não encontrado:", email)
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 400 }
      )
    }

    // Verificar se o código está expirado
    const now = new Date()
    const expiresAt = new Date(user.phone_verification_expires_at)
    
    if (now > expiresAt) {
      console.log("[v0] Código expirado para:", email)
      return NextResponse.json(
        { message: "Código expirado. Solicite um novo código." },
        { status: 400 }
      )
    }

    // Verificar se o código está correto
    if (user.phone_verification_code !== code) {
      console.log("[v0] Código incorreto para:", email)
      return NextResponse.json(
        { message: "Código inválido" },
        { status: 400 }
      )
    }

    // Atualizar perfil do usuário para marcar telefone como validado
    const { error: updateError } = await supabase
      .from("users")
      .update({
        phone: phone,
        phone_verified: true,
        phone_verification_code: null,
        phone_verification_expires_at: null,
      })
      .eq("email", email)

    if (updateError) {
      console.error("[v0] Erro ao atualizar perfil:", updateError)
      return NextResponse.json(
        { message: "Erro ao salvar telefone validado" },
        { status: 500 }
      )
    }

    console.log("[v0] Telefone validado com sucesso:", phone, "para:", email)

    return NextResponse.json({
      success: true,
      message: "Telefone validado com sucesso",
      phone: phone,
    })
  } catch (error) {
    console.error("[v0] Erro em verify:", error)
    return NextResponse.json(
      { message: "Erro ao processar requisição" },
      { status: 500 }
    )
  }
}
