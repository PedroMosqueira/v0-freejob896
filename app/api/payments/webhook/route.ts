import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type Stripe from "stripe"

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

        // Atualizar subscrição do usuário no banco de dados
        const userEmail = session.metadata?.userEmail
        const planSlug = session.metadata?.planId

        console.log("[v0] Metadata extracted:", { userEmail, planSlug })
        console.log("[v0] Full metadata available:", Object.keys(session.metadata || {}))

        if (!userEmail || !planSlug) {
          console.error("[v0] Missing required metadata:", { 
            hasUserEmail: !!userEmail, 
            hasPlanSlug: !!planSlug,
            fullMetadata: session.metadata
          })
        }

        if (userEmail && planSlug) {
          try {
            // 1. Buscar o usuário
            const { data: user, error: userError } = await supabase
              .from("users")
              .select("id")
              .eq("email", userEmail)
              .single()

            if (userError || !user) {
              console.error("[v0] Usuário não encontrado:", userEmail)
              break
            }

            console.log("[v0] User found:", { userId: user.id, email: userEmail })

            // 2. Buscar o plano pela slug
            const { data: plan, error: planError } = await supabase
              .from("subscription_plans")
              .select("id")
              .eq("slug", planSlug)
              .single()

            if (planError || !plan) {
              console.error("[v0] Plano não encontrado:", { planSlug, error: planError })
              break
            }

            console.log("[v0] Plan found:", { planId: plan.id, slug: planSlug })

            // 3. Criar ou atualizar registro em user_subscriptions
            const subscriptionData = {
              user_id: user.id,
              plan_id: plan.id,
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 dias
              billing_cycle: "monthly",
              cancel_at_period_end: false,
            }

            // Tentar fazer upsert
            const { error: subscriptionError, data: subscriptionData_result } = await supabase
              .from("user_subscriptions")
              .upsert(
                {
                  ...subscriptionData,
                  id: session.subscription,
                },
                { onConflict: "stripe_subscription_id" }
              )
              .select()

            if (subscriptionError) {
              console.error("[v0] Erro ao criar subscrição:", {
                error: subscriptionError.message,
                code: subscriptionError.code,
              })
            } else {
              console.log("[v0] Subscrição criada/atualizada com sucesso:", {
                email: userEmail,
                planSlug,
                subscriptionId: session.subscription,
                rowsAffected: subscriptionData_result?.length,
              })
            }
          } catch (err) {
            console.error("[v0] Erro ao processar upgrade de subscrição:", err)
          }
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
