import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ensureUserProfile } from "@/lib/ensure-user-profile"

export const dynamic = "force-dynamic"

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const result = await ensureUserProfile(user)
  if (!result.ok) {
    console.error("Erro ao garantir perfil do usuário:", result.error)
    return NextResponse.json({ error: "Não foi possível criar seu perfil" }, { status: 500 })
  }

  return NextResponse.json({ created: result.created })
}
