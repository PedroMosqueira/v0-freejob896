import { NextResponse, type NextRequest } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createAdminClient, getSubscriptionPeriod, mapSubscriptionStatus } from "@/lib/stripe-subscription-sync"
import { isPaidSubscriptionStatus } from "@/lib/subscription-status"

export const dynamic = "force-dynamic"

// CDC art. 49: online purchases can be withdrawn within 7 days for a full refund.
const WITHDRAWAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

async function loadSubscription() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }

  const admin = createAdminClient()
  const { data: dbUser } = await admin.from("users").select("id").ilike("email", user.email).limit(1).maybeSingle()
  if (!dbUser) return { error: NextResponse.json({ subscription: null }) }

  const { data: row } = await admin
    .from("user_subscriptions")
    .select("id, status, stripe_subscription_id, subscription_plans(slug, name)")
    .eq("user_id", dbUser.id)
    .maybeSingle()

  if (!row?.stripe_subscription_id || !isPaidSubscriptionStatus(row.status)) {
    return { error: NextResponse.json({ subscription: null }) }
  }

  const subscription = await stripe.subscriptions.retrieve(row.stripe_subscription_id)
  return { admin, row, subscription }
}

function describe(subscription: Stripe.Subscription, planName: string | null) {
  const period = getSubscriptionPeriod(subscription)
  const startedAt = subscription.start_date * 1000
  return {
    planName,
    status: mapSubscriptionStatus(subscription.status),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || Boolean(subscription.cancel_at),
    periodEnd: period.end,
    refundEligible: Date.now() - startedAt <= WITHDRAWAL_WINDOW_MS,
    refundDeadline: new Date(startedAt + WITHDRAWAL_WINDOW_MS).toISOString(),
  }
}

function planNameOf(row: { subscription_plans: unknown }) {
  const plan = row.subscription_plans as { name?: string } | { name?: string }[] | null
  return (Array.isArray(plan) ? plan[0]?.name : plan?.name) ?? null
}

export async function GET() {
  try {
    const result = await loadSubscription()
    if ("error" in result) return result.error
    return NextResponse.json({ subscription: describe(result.subscription, planNameOf(result.row)) })
  } catch (error) {
    console.error("[subscriptions/manage] GET failed:", error)
    return NextResponse.json({ error: "Não foi possível carregar sua assinatura" }, { status: 500 })
  }
}

async function refundLatestInvoice(subscription: Stripe.Subscription) {
  const invoiceId =
    typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id
  if (!invoiceId) return false

  const payments = await stripe.invoicePayments.list({ invoice: invoiceId, status: "paid", limit: 1 })
  const payment = payments.data[0]?.payment
  if (!payment) return false

  const paymentIntent =
    typeof payment.payment_intent === "string" ? payment.payment_intent : payment.payment_intent?.id
  const charge = typeof payment.charge === "string" ? payment.charge : payment.charge?.id
  if (!paymentIntent && !charge) return false

  await stripe.refunds.create(
    paymentIntent ? { payment_intent: paymentIntent } : { charge: charge! },
    { idempotencyKey: `withdrawal-refund-${invoiceId}` },
  )
  return true
}

export async function POST(req: NextRequest) {
  try {
    const { action } = (await req.json().catch(() => ({}))) as { action?: string }
    if (action !== "cancel" && action !== "resume") {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }

    const result = await loadSubscription()
    if ("error" in result) {
      return NextResponse.json({ error: "Você não tem uma assinatura ativa" }, { status: 400 })
    }
    const { admin, row, subscription } = result
    const current = describe(subscription, planNameOf(row))

    if (action === "resume") {
      const updated = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: false })
      await admin
        .from("user_subscriptions")
        .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq("id", row.id)
      return NextResponse.json({
        message: "Assinatura reativada. A renovação mensal continua normalmente.",
        subscription: describe(updated, current.planName),
      })
    }

    if (current.refundEligible) {
      const refunded = await refundLatestInvoice(subscription)
      await stripe.subscriptions.cancel(subscription.id)
      await admin
        .from("user_subscriptions")
        .update({ status: "canceled", cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq("id", row.id)
      return NextResponse.json({
        message: refunded
          ? "Assinatura cancelada e valor estornado integralmente. O estorno aparece na fatura do cartão em até 10 dias úteis."
          : "Assinatura cancelada.",
        subscription: null,
      })
    }

    const updated = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true })
    await admin
      .from("user_subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("id", row.id)
    return NextResponse.json({
      message: "Renovação cancelada. Você continua com o plano até o fim do período já pago.",
      subscription: describe(updated, current.planName),
    })
  } catch (error) {
    console.error("[subscriptions/manage] POST failed:", error)
    return NextResponse.json({ error: "Não foi possível atualizar sua assinatura. Tente novamente." }, { status: 500 })
  }
}
