import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

// Stripe webhooks and the post-checkout return run without a reliable user
// session, so RLS would block these writes with the cookie-based client.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Supabase service role is not configured")
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  // Newer API versions expose the billing period on subscription items.
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number })
    | undefined
  const legacy = subscription as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
  }
  const start = item?.current_period_start ?? legacy.current_period_start
  const end = item?.current_period_end ?? legacy.current_period_end
  return {
    start: start ? new Date(start * 1000).toISOString() : new Date().toISOString(),
    end: end ? new Date(end * 1000).toISOString() : null,
  }
}

export function mapSubscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === "active" || status === "trialing") return "active"
  if (status === "canceled" || status === "incomplete_expired") return "canceled"
  return "paused"
}

export function getCheckoutEmail(session: Stripe.Checkout.Session) {
  return (session.customer_email || session.customer_details?.email || "").trim().toLowerCase()
}

/**
 * Activates the user's plan from a completed subscription checkout.
 * Idempotent: the webhook and the post-checkout return can both call it.
 */
export async function activateSubscriptionFromCheckout(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return

  const email = getCheckoutEmail(session)
  const planSlug = session.metadata?.plan_slug
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id

  if (!email || !planSlug || !subscriptionId) {
    throw new Error(
      `Checkout ${session.id} missing data (email: ${Boolean(email)}, plan: ${planSlug}, sub: ${Boolean(subscriptionId)})`,
    )
  }

  const supabase = createAdminClient()

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle()
  if (userError) throw userError
  if (!user) throw new Error(`User not found for checkout ${session.id}`)

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("slug", planSlug)
    .maybeSingle()
  if (planError) throw planError
  if (!plan) throw new Error(`Plan not found: ${planSlug}`)

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const period = getSubscriptionPeriod(subscription)

  // user_subscriptions has UNIQUE(user_id): update the user's existing row.
  const { error: subError } = await supabase.from("user_subscriptions").upsert(
    {
      user_id: user.id,
      plan_id: plan.id,
      status: mapSubscriptionStatus(subscription.status),
      billing_cycle: "monthly",
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId ?? null,
      current_period_start: period.start,
      current_period_end: period.end,
    },
    { onConflict: "user_id" },
  )
  if (subError) throw subError

  console.log("[stripe-sync] Subscription activated:", { userId: user.id, plan: planSlug })
}
