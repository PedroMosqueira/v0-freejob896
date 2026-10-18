import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type IncomingSubscription = {
  endpoint?: unknown
  keys?: { auth?: unknown; p256dh?: unknown }
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { subscription } = (await request.json().catch(() => ({}))) as { subscription?: IncomingSubscription }
  const endpoint = subscription?.endpoint
  const auth = subscription?.keys?.auth
  const p256dh = subscription?.keys?.p256dh

  const valid =
    typeof endpoint === "string" &&
    endpoint.startsWith("https://") &&
    endpoint.length < 1000 &&
    typeof auth === "string" &&
    auth.length < 200 &&
    typeof p256dh === "string" &&
    p256dh.length < 200

  if (!valid) {
    return NextResponse.json({ error: "Inscrição inválida" }, { status: 400 })
  }

  const admin = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: { persistSession: false },
  })

  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_email: user.email.toLowerCase(),
      endpoint,
      auth,
      p256dh,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  )

  if (error) {
    console.error("[push] Failed to save subscription:", error.message)
    return NextResponse.json({ error: "Não foi possível ativar as notificações" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
