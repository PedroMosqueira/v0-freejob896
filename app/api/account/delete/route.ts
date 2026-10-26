import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { clearSupabaseSessionCookies } from "@/lib/supabase/auth-cookies"
import { stripe, isStripeConfigured } from "@/lib/stripe"

export const dynamic = "force-dynamic"

const CONFIRMATION_WORD = "EXCLUIR"
const ACTIVE_NEED_STATUSES = ["aceito", "aguardando_avaliacao"]

/**
 * Permanently deletes the signed-in user's account and personal data (LGPD art. 18).
 * Blocked while a service is in progress so neither party loses an active job or payment.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  if (body?.confirmation !== CONFIRMATION_WORD) {
    return NextResponse.json({ error: `Digite ${CONFIRMATION_WORD} para confirmar.` }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: "Você precisa estar logado." }, { status: 401 })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Serviço indisponível. Tente novamente mais tarde." }, { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const email = user.email.toLowerCase()

  const { count: activeServices } = await admin
    .from("needs")
    .select("id", { count: "exact", head: true })
    .in("status", ACTIVE_NEED_STATUSES)
    .or(`requester_email.ilike.${email},chat_provider_email.ilike.${email}`)

  if (activeServices && activeServices > 0) {
    return NextResponse.json(
      {
        error:
          "Você tem serviços em andamento. Conclua ou cancele esses serviços antes de excluir sua conta.",
      },
      { status: 409 },
    )
  }

  try {
    const { data: profile } = await admin.from("users").select("id").ilike("email", email).maybeSingle()

    if (profile?.id && isStripeConfigured()) {
      const { data: subscriptions } = await admin
        .from("user_subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", profile.id)
        .not("stripe_subscription_id", "is", null)

      for (const sub of subscriptions ?? []) {
        try {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id as string)
        } catch (error) {
          console.error("[account-delete] Failed to cancel Stripe subscription:", error)
        }
      }
    }

    // Order matters: child rows first, then the profile (cascades ratings and subscriptions).
    await admin.from("push_subscriptions").delete().ilike("user_email", email)
    await admin.from("notifications").delete().ilike("user_id", email)
    await admin.from("need_proposals").delete().ilike("professional_email", email)
    await admin.from("chat_threads").delete().ilike("professional_email", email)
    await admin.from("needs").delete().ilike("requester_email", email)
    await admin.from("users").delete().ilike("email", email)

    const { error: authError } = await admin.auth.admin.deleteUser(user.id)
    if (authError) throw authError

    // signOut can't revoke a session whose user no longer exists, so the cookies are expired explicitly.
    await supabase.auth.signOut({ scope: "local" }).catch(() => {})
    clearSupabaseSessionCookies(await cookies())
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[account-delete] Failed to delete account:", error)
    return NextResponse.json(
      { error: "Não foi possível excluir sua conta. Tente novamente ou fale com o suporte." },
      { status: 500 },
    )
  }
}
