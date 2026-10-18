import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: unknown }
  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json({ error: "Endpoint obrigatório" }, { status: 400 })
  }

  const admin = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: { persistSession: false },
  })

  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_email", user.email.toLowerCase())

  if (error) {
    console.error("[push] Failed to remove subscription:", error.message)
    return NextResponse.json({ error: "Não foi possível desativar" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
