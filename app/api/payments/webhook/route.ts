import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: "Webhook inválido" }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log("[v0] Checkout session completed:", session.id)

        // Atualizar plano do usuário no banco de dados
        const userEmail = session.metadata?.userEmail
        const planId = session.metadata?.planId

        if (userEmail && planId) {
          try {
            // Determinar o novo plano baseado no planId
            let newPlan = "free"
            if (planId === "pro") {
              newPlan = "pro"
            } else if (planId === "business") {
              newPlan = "business"
            }

            // Atualizar usuário com novo plano
            const { error: updateError } = await supabase
              .from("users")
              .update({
                subscription_plan: newPlan,
                subscription_active: true,
                subscription_start_date: new Date().toISOString(),
              })
              .eq("email", userEmail)

            if (updateError) {
              console.error("[v0] Erro ao atualizar plano do usuário:", updateError)
            } else {
              console.log(`[v0] Plano atualizado para ${userEmail}: ${newPlan}`)
            }
          } catch (err) {
            console.error("[v0] Erro ao processar upgrade de plano:", err)
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
