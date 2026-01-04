import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { planSlug, billingCycle } = await request.json()

    if (!planSlug || !billingCycle) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 })
    }

    // Buscar plano
    const { data: plan } = await supabase.from("subscription_plans").select("*").eq("slug", planSlug).single()

    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    // Buscar assinatura do usuário para verificar se é fundador
    const { data: subscription } = await supabase.from("user_subscriptions").select("*").eq("user_id", user.id).single()

    const isFounder = subscription?.is_founder || false
    const discount = isFounder ? 0.5 : 0 // 50% para fundadores

    // Calcular preço com desconto
    const basePrice =
      billingCycle === "monthly" ? Number.parseFloat(plan.price_monthly) : Number.parseFloat(plan.price_annual)

    const finalPrice = Math.round(basePrice * (1 - discount) * 100) // em centavos

    // Criar ou obter customer no Stripe
    let customerId = subscription?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
          isFounder: isFounder.toString(),
        },
      })
      customerId = customer.id

      // Atualizar no banco
      await supabase.from("user_subscriptions").update({ stripe_customer_id: customerId }).eq("user_id", user.id)
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `${plan.name} - ${billingCycle === "monthly" ? "Mensal" : "Anual"}`,
              description: isFounder ? `🏆 Preço especial Membro Fundador (50% OFF)` : plan.description,
            },
            unit_amount: finalPrice,
            recurring: {
              interval: billingCycle === "monthly" ? "month" : "year",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000"}/pricing`,
      metadata: {
        userId: user.id,
        planId: plan.id,
        billingCycle,
        isFounder: isFounder.toString(),
      },
    })

    console.log("[v0] Checkout session created:", session.id)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("[v0] Error creating checkout session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar checkout" },
      { status: 500 },
    )
  }
}
