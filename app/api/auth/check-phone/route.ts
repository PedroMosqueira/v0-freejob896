import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()
    console.log("[v0] check-phone: Verificando telefone:", phone)

    if (!phone || phone.length !== 11) {
      console.error("[v0] Telefone inválido. Comprimento:", phone?.length)
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 },
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Verificar se usuário com este telefone existe
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = "No rows found"
      console.error("[v0] Erro ao verificar telefone:", error)
      return NextResponse.json(
        { error: "Erro ao verificar telefone" },
        { status: 500 },
      )
    }

    const exists = !!data
    console.log("[v0] Usuário existe:", exists)

    return NextResponse.json({
      exists,
    })
  } catch (error) {
    console.error("[v0] Erro na rota check-phone:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    )
  }
}
