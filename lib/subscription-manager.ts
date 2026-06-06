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

  // Get user first to get their ID
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", userEmail)
    .single()

  if (userError || !user) {
    console.error("[v0] Error getting user:", userError)
    return null
  }

  // Get active subscription from user_subscriptions
  const { data: subscription, error: subError } = await supabase
    .from("user_subscriptions")
    .select("*, subscription_plans(slug, name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (subError) {
    // User doesn't have active subscription, return free plan
    console.log("[v0] No active subscription, user is on free plan")
    return {
      plan: "free",
      started_at: null,
      expires_at: null,
      is_active: false,
    }
  }

  const planSlug = subscription.subscription_plans?.slug || "free"
  const now = new Date()
  const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null
  const isActive = subscription.status === "active" && (!currentPeriodEnd || currentPeriodEnd > now)

  return {
    plan: (planSlug as SubscriptionPlan) || "free",
    started_at: subscription.current_period_start,
    expires_at: subscription.current_period_end,
    is_active: isActive,
  }
}

export async function upgradeToPlan(
  userEmail: string,
  planSlug: SubscriptionPlan,
  billingCycle: "monthly" | "annual" = "monthly",
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  console.log("[v0] Upgrading user to plan:", userEmail, planSlug, billingCycle)

  const supabase = createSupabaseServerClient()

  try {
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .single()

    if (userError || !user) {
      return { success: false, error: "User not found" }
    }

    // Get plan ID from subscription_plans
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("slug", planSlug)
      .single()

    if (planError || !plan) {
      return { success: false, error: "Plan not found" }
    }

    // Create subscription record
    const now = new Date()
    const currentPeriodEnd = new Date()
    currentPeriodEnd.setMonth(billingCycle === "monthly" ? currentPeriodEnd.getMonth() + 1 : currentPeriodEnd.getMonth() + 12)

    const { data: subscription, error: createError } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        status: "active",
        billing_cycle: billingCycle,
        current_period_start: now.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error("[v0] Error creating subscription:", createError)
      return { success: false, error: createError.message }
    }

    // Also update users table for quick access (denormalization)
    await supabase
      .from("users")
      .update({ subscription_plan: planSlug })
      .eq("id", user.id)

    console.log("[v0] Successfully upgraded to", planSlug, "plan")
    return { success: true, subscriptionId: subscription.id }
  } catch (error) {
    console.error("[v0] Error upgrading plan:", error)
    return { success: false, error: String(error) }
  }
}

export async function upgradeToPremium(userEmail: string, durationMonths = 1): Promise<boolean> {
  console.log("[v0] Upgrading to premium (agencia):", userEmail, "for", durationMonths, "months")
  const result = await upgradeToPlan(userEmail, "agencia", "monthly")
  return result.success
}

export async function upgradeToSimples(userEmail: string, durationMonths = 1): Promise<boolean> {
  console.log("[v0] Upgrading to simples:", userEmail, "for", durationMonths, "months")
  const result = await upgradeToPlan(userEmail, "simples", "monthly")
  return result.success
}

export async function cancelSubscription(userEmail: string): Promise<boolean> {
  console.log("[v0] Canceling subscription for:", userEmail)

  const supabase = createSupabaseServerClient()

  try {
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .single()

    if (userError || !user) {
      console.error("[v0] User not found")
      return false
    }

    // Get active subscription
    const { data: subscription, error: getError } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (getError || !subscription) {
      console.log("[v0] No active subscription to cancel")
      return false
    }

    // Cancel subscription
    const { error: cancelError } = await supabase
      .from("user_subscriptions")
      .update({ status: "canceled" })
      .eq("id", subscription.id)

    if (cancelError) {
      console.error("[v0] Error canceling subscription:", cancelError)
      return false
    }

    // Reset user plan to free
    await supabase
      .from("users")
      .update({ subscription_plan: "free" })
      .eq("id", user.id)

    console.log("[v0] Successfully canceled subscription")
    return true
  } catch (error) {
    console.error("[v0] Error canceling subscription:", error)
    return false
  }
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
