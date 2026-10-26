import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getActiveInterestsSummary } from "@/lib/simultaneous-interests"

export const dynamic = "force-dynamic"

// Counts the signed-in professional's interests that occupy a simultaneous slot.
// The email comes from the session, never from the query string.
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const { count, heldCount, nextReleaseAt } = await getActiveInterestsSummary(user.email)
    return NextResponse.json({ count, heldCount, nextReleaseAt })
  } catch (error) {
    console.error("[interests/active] Failed to count active interests:", error)
    return NextResponse.json({ error: "Não foi possível carregar as propostas ativas." }, { status: 500 })
  }
}
