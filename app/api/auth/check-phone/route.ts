import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone || phone.length !== 11) {
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
      console.error("Erro ao verificar telefone:", error)
      return NextResponse.json(
        { error: "Erro ao verificar telefone" },
        { status: 500 },
      )
    }

    return NextResponse.json({
      exists: !!data,
    })
  } catch (error) {
    console.error("Erro na rota check-phone:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    )
  }
}
