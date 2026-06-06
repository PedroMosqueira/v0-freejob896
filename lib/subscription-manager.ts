import { createSupabaseServerClient } from "./supabase/server"

export type SubscriptionPlan = "free" | "simples" | "agencia"

export interface UserSubscription {
  plan: SubscriptionPlan
  started_at: string | null
  expires_at: string | null
  is_active: boolean
}

// Benefícios de cada plano
export const PLAN_FEATURES = {
  free: {
    name: "Gratuito",
    price: 0,
    features: [
      "3 interesses gratuitos por mês",
      "Solicitações ilimitadas",
      "Chat completo",
      "Ganhe 30% de comissão em transações pagas",
      "Cashback de 20% para clientes",
    ],
    limits: {
      interests_per_month: 3, // 3 interesses grátis
      simultaneous_interests: 1, // apenas 1 simultâneo
      bids_per_month: -1, // ilimitado
      has_ads: true,
      priority_support: false,
      profile_boost: false,
    },
  },
  simples: {
    name: "Plano Simples",
    price: 29.90,
    features: [
      "Sem limite de quantidade de propostas",
      "Limite de 2 propostas simultâneas",
      "Acesso a todas as demandas",
      "Cancelamento a qualquer momento",
    ],
    limits: {
      interests_per_month: -1, // ilimitado
      simultaneous_interests: 2, // 2 simultâneas
      bids_per_month: -1,
      has_ads: true,
      priority_support: false,
      profile_boost: false,
    },
  },
  agencia: {
    name: "Plano Agência",
    price: 49.90,
    features: [
      "Sem limite de quantidade de propostas",
      "Limite de 8 propostas simultâneas",
      "Acesso prioritário a demandas",
      "Suporte dedicado",
    ],
    limits: {
      interests_per_month: -1, // ilimitado
      simultaneous_interests: 8, // 8 simultâneas
      bids_per_month: -1,
      has_ads: false,
      priority_support: true,
      profile_boost: true,
    },
  },
}

export async function getUserSubscription(userEmail: string): Promise<UserSubscription | null> {
  console.log("[v0] Getting subscription for:", userEmail)

  const supabase = createSupabaseServerClient()

  const { data: user, error } = await supabase
    .from("users")
    .select("subscription_plan, subscription_started_at, subscription_expires_at")
    .eq("email", userEmail)
    .single()

  if (error || !user) {
    console.error("[v0] Error getting subscription:", error)
    return null
  }

  const now = new Date()
  const expiresAt = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null
  const isActive = user.subscription_plan === "premium" && (!expiresAt || expiresAt > now)

  return {
    plan: (user.subscription_plan as SubscriptionPlan) || "free",
    started_at: user.subscription_started_at,
    expires_at: user.subscription_expires_at,
    is_active: isActive,
  }
}

export async function upgradeToPremium(userEmail: string, durationMonths = 1): Promise<boolean> {
  console.log("[v0] Upgrading to premium:", userEmail, "for", durationMonths, "months")

  const supabase = createSupabaseServerClient()

  const now = new Date()
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

  const { error } = await supabase
    .from("users")
    .update({
      subscription_plan: "agencia",
      subscription_started_at: now.toISOString(),
      subscription_expires_at: expiresAt.toISOString(),
    })
    .eq("email", userEmail)

  if (error) {
    console.error("[v0] Error upgrading to premium:", error)
    return false
  }

  console.log("[v0] Successfully upgraded to agencia plan")
  return true
}

export async function upgradeToSimples(userEmail: string, durationMonths = 1): Promise<boolean> {
  console.log("[v0] Upgrading to simples:", userEmail, "for", durationMonths, "months")

  const supabase = createSupabaseServerClient()

  const now = new Date()
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

  const { error } = await supabase
    .from("users")
    .update({
      subscription_plan: "simples",
      subscription_started_at: now.toISOString(),
      subscription_expires_at: expiresAt.toISOString(),
    })
    .eq("email", userEmail)

  if (error) {
    console.error("[v0] Error upgrading to simples:", error)
    return false
  }

  console.log("[v0] Successfully upgraded to simples plan")
  return true
}

export async function cancelSubscription(userEmail: string): Promise<boolean> {
  console.log("[v0] Canceling subscription for:", userEmail)

  const supabase = createSupabaseServerClient()

  const { error } = await supabase
    .from("users")
    .update({
      subscription_plan: "free",
      subscription_expires_at: null,
    })
    .eq("email", userEmail)

  if (error) {
    console.error("[v0] Error canceling subscription:", error)
    return false
  }

  console.log("[v0] Successfully canceled subscription")
  return true
}

export function canPerformAction(
  subscription: UserSubscription,
  action: "interest" | "bid",
  usedThisMonth: number,
): boolean {
  const limits = PLAN_FEATURES[subscription.plan].limits

  if (action === "interest") {
    return limits.interests_per_month === -1 || usedThisMonth < limits.interests_per_month
  }

  if (action === "bid") {
    return limits.bids_per_month === -1 || usedThisMonth < limits.bids_per_month
  }

  return false
}
