"use server"

import { createSupabaseServerClient } from "./supabase/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

export interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  description: string
  priceMonthly: number
  priceAnnual: number
  stripePriceIdMonthly: string | null
  stripePriceIdAnnual: string | null
  features: string[]
  isActive: boolean
}

export interface UserSubscription {
  id: string
  userId: string
  planId: string | null
  status: "free" | "active" | "cancelled" | "expired"
  billingCycle: "monthly" | "annual" | null
  isFounder: boolean
  founderDiscount: number
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  plan?: SubscriptionPlan
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true })

  if (error) throw error

  return data.map((plan) => ({
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    priceMonthly: Number.parseFloat(plan.price_monthly),
    priceAnnual: Number.parseFloat(plan.price_annual),
    stripePriceIdMonthly: plan.stripe_price_id_monthly,
    stripePriceIdAnnual: plan.stripe_price_id_annual,
    features: plan.features,
    isActive: plan.is_active,
  }))
}

export async function getUserSubscription(): Promise<UserSubscription | null> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq("user_id", user.id)
    .single()

  if (error) {
    console.error("[v0] Error fetching subscription:", error)
    return null
  }

  return {
    id: data.id,
    userId: data.user_id,
    planId: data.plan_id,
    status: data.status,
    billingCycle: data.billing_cycle,
    isFounder: data.is_founder,
    founderDiscount: Number.parseFloat(data.founder_discount),
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    plan: data.plan
      ? {
          id: data.plan.id,
          name: data.plan.name,
          slug: data.plan.slug,
          description: data.plan.description,
          priceMonthly: Number.parseFloat(data.plan.price_monthly),
          priceAnnual: Number.parseFloat(data.plan.price_annual),
          stripePriceIdMonthly: data.plan.stripe_price_id_monthly,
          stripePriceIdAnnual: data.plan.stripe_price_id_annual,
          features: data.plan.features,
          isActive: data.plan.is_active,
        }
      : undefined,
  }
}

export async function createCheckoutSession(
  planSlug: string,
  billingCycle: "monthly" | "annual",
): Promise<{ url: string }> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Usuário não autenticado")

  // Buscar plano
  const { data: plan } = await supabase.from("subscription_plans").select("*").eq("slug", planSlug).single()

  if (!plan) throw new Error("Plano não encontrado")

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

  return { url: session.url! }
}
