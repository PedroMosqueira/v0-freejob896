import { NextResponse, type NextRequest } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import {
  activateSubscriptionFromCheckout,
  createAdminClient,
  getSubscriptionPeriod,
  mapSubscriptionStatus,
} from "@/lib/stripe-subscription-sync"
import { buildNotificationUrl, safeSendPush } from "@/lib/push-notifications-server"

/**
 * Single Stripe webhook processor. Both /api/webhooks/stripe and the legacy
 * /api/payments/webhook delegate here, so whichever URL is registered in the
 * Stripe dashboard handles subscriptions and service payments the same way.
 */
export async function handleStripeWebhook(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !secret) {
    console.error("[stripe-webhook] Missing signature header or STRIPE_WEBHOOK_SECRET")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (error) {
    console.error("[stripe-webhook] Signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await activateSubscriptionFromCheckout(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.updated":
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      case "customer.subscription.deleted":
        await markSubscriptionCanceled(event.data.object as Stripe.Subscription)
        break
      case "payment_intent.succeeded":
        await handleServicePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      case "payment_intent.payment_failed":
        await handleServicePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break
      default:
        break
    }
  } catch (error) {
    // Returning 500 makes Stripe retry the event instead of silently losing it.
    console.error(`[stripe-webhook] Failed to process ${event.type}:`, error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()
  const period = getSubscriptionPeriod(subscription)

  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      status: mapSubscriptionStatus(subscription.status),
      current_period_start: period.start,
      current_period_end: period.end,
      cancel_at_period_end: subscription.cancel_at_period_end || Boolean(subscription.cancel_at),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
  if (error) throw error
}

async function markSubscriptionCanceled(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("user_subscriptions")
    .update({ status: "canceled", cancel_at_period_end: false, updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
  if (error) throw error
}

async function handleServicePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createAdminClient()

  const { data: payment, error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: paymentIntent.payment_method_types[0],
    })
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .neq("status", "paid")
    .select("need_id, professional_email, client_email")
    .maybeSingle()
  if (error) throw error

  // Subscription invoices also emit payment_intent.succeeded; only service payments have a row here.
  // The .neq("status", "paid") guard keeps Stripe retries from notifying twice.
  if (!payment) return

  await supabase.from("needs").update({ status: "em_andamento" }).eq("id", payment.need_id)

  const professionalMessage = "O cliente confirmou o pagamento. Você pode iniciar o serviço."
  const clientMessage = "Seu pagamento foi confirmado. O profissional pode iniciar o serviço."

  await supabase.from("notifications").insert([
    {
      user_id: payment.professional_email,
      title: "Pagamento recebido!",
      message: professionalMessage,
      type: "completion",
      related_need_id: payment.need_id,
    },
    {
      user_id: payment.client_email,
      title: "Pagamento confirmado!",
      message: clientMessage,
      type: "completion",
      related_need_id: payment.need_id,
    },
  ])

  const url = buildNotificationUrl(payment.need_id)
  await Promise.all([
    safeSendPush(payment.professional_email, { title: "Pagamento recebido!", body: professionalMessage, data: { url } }),
    safeSendPush(payment.client_email, { title: "Pagamento confirmado!", body: clientMessage, data: { url } }),
  ])
}

async function handleServicePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("payments")
    .update({
      status: "failed",
      failure_reason: paymentIntent.last_payment_error?.message || "Pagamento falhou",
    })
    .eq("stripe_payment_intent_id", paymentIntent.id)
  if (error) throw error
}
