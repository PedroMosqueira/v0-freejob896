import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    const { email, isProfessional, cpf, professionalPhone } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 },
      )
    }

    // Atualizar dados profissionais do usuário
    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_professional: isProfessional,
        cpf: isProfessional ? cpf : null,
        professional_phone: isProfessional ? professionalPhone : null,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email)

    if (updateError) {
      console.error("Error updating professional data:", updateError)
      return NextResponse.json(
        { error: "Erro ao atualizar dados profissionais" },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Dados profissionais atualizados com sucesso",
    })
  } catch (error) {
    console.error("Error in professional data API:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    )
  }
}
