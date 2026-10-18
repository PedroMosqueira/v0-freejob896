import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type Stripe from "stripe"
import { buildNotificationUrl, safeSendPush } from "@/lib/push-notifications-server"
import { activateSubscriptionFromCheckout } from "@/lib/stripe-subscription-sync"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

export async function POST(request: NextRequest) {
  console.log("[v0] ====== WEBHOOK RECEIVED ======")
  console.log("[v0] Webhook Secret configured:", !!webhookSecret)
  console.log("[v0] Webhook Secret starts with:", webhookSecret.substring(0, 10))
  
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  console.log("[v0] Signature present:", !!signature)

  if (!signature) {
    console.error("[v0] Missing signature")
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log("[v0] Event constructed successfully:", event.type)
  } catch (error) {
    console.error("[v0] Webhook signature verification failed:", {
      error: error instanceof Error ? error.message : String(error),
      webhookSecretConfigured: !!webhookSecret,
    })
    return NextResponse.json({ error: "Webhook inválido" }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  try {
    console.log("[v0] Webhook event received:", {
      type: event.type,
      id: event.id,
      timestamp: new Date().toISOString(),
    })

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log("[v0] Checkout session completed:", {
          sessionId: session.id,
          customerId: session.customer_email,
          metadata: session.metadata,
          status: session.payment_status,
          subscriptionId: session.subscription,
        })

        // Same idempotent activation used by /api/webhooks/stripe and the checkout return.
        // The previous inline upsert wrote a Stripe id into the uuid primary key, ran
        // under RLS without a session, and conflicted with UNIQUE(user_id), so it never
        // activated anything (Simples or Agência).
        if (session.mode === "subscription") {
          await activateSubscriptionFromCheckout(session)
        }

        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Atualizar status do pagamento
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_method: paymentIntent.payment_method_types[0],
          })
          .eq("stripe_payment_intent_id", paymentIntent.id)

        if (updateError) {
          console.error("[v0] Erro ao atualizar pagamento:", updateError)
        }

        // Buscar dados do pagamento
        const { data: payment } = await supabase
          .from("payments")
          .select("*")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .single()

        if (payment) {
          // Atualizar status da solicitação para "em andamento"
          await supabase.from("needs").update({ status: "em_andamento" }).eq("id", payment.need_id)

          // Criar notificação para o profissional
          await supabase.from("notifications").insert({
            user_id: payment.professional_email,
            title: "Pagamento recebido!",
            message: `O cliente confirmou o pagamento. Você pode iniciar o serviço.`,
            type: "completion",
            related_need_id: payment.need_id,
          })

          // Criar notificação para o cliente
          await supabase.from("notifications").insert({
            user_id: payment.client_email,
            title: "Pagamento confirmado!",
            message: `Seu pagamento foi confirmado. O profissional pode iniciar o serviço.`,
            type: "completion",
            related_need_id: payment.need_id,
          })

          const url = buildNotificationUrl(payment.need_id)
          await Promise.all([
            safeSendPush(payment.professional_email, {
              title: "Pagamento recebido!",
              body: "O cliente confirmou o pagamento. Você pode iniciar o serviço.",
              data: { url },
            }),
            safeSendPush(payment.client_email, {
              title: "Pagamento confirmado!",
              body: "Seu pagamento foi confirmado. O profissional pode iniciar o serviço.",
              data: { url },
            }),
          ])
        }

        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        await supabase
          .from("payments")
          .update({
            status: "failed",
            failure_reason: paymentIntent.last_payment_error?.message || "Pagamento falhou",
          })
          .eq("stripe_payment_intent_id", paymentIntent.id)

        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Erro ao processar webhook:", error)
    return NextResponse.json({ error: "Erro ao processar webhook" }, { status: 500 })
  }
}
