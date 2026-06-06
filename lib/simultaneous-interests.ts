import { createSupabaseServerClient } from "./supabase/server"
import { PLAN_FEATURES, type SubscriptionPlan } from "./subscription-manager"

export interface ActiveInterest {
  id: string
  need_id: string
  professional_email: string
  created_at: string
  status: string
}

/**
 * Get count of active (non-declined, non-accepted) interests for a professional
 */
export async function getActiveInterestsCount(professionalEmail: string): Promise<number> {
  const supabase = createSupabaseServerClient()

  const { data, error, count } = await supabase
    .from("need_proposals")
    .select("id", { count: "exact" })
    .eq("professional_email", professionalEmail)
    .eq("type", "interest_only")
    .in("status", ["pending", "viewed"]) // Active statuses
    .limit(0)

  if (error) {
    console.error("[v0] Error getting active interests count:", error)
    return 0
  }

  return count || 0
}

/**
 * Check if professional can send a new interest based on their plan
 */
export async function canSendInterest(
  professionalEmail: string,
  userPlan: SubscriptionPlan,
): Promise<{ allowed: boolean; reason?: string; currentCount?: number; limit?: number }> {
  const planLimits = PLAN_FEATURES[userPlan]?.limits

  if (!planLimits) {
    return {
      allowed: false,
      reason: "Plano não encontrado",
    }
  }

  // Get current active interests
  const activeCount = await getActiveInterestsCount(professionalEmail)
  const simultaneousLimit = planLimits.simultaneous_interests

  console.log(
    `[v0] Active interests check: ${activeCount}/${simultaneousLimit} for ${professionalEmail} on ${userPlan} plan`,
  )

  // If limit is -1, it's unlimited
  if (simultaneousLimit === -1) {
    return {
      allowed: true,
      currentCount: activeCount,
      limit: -1,
    }
  }

  // Check if reached limit
  if (activeCount >= simultaneousLimit) {
    return {
      allowed: false,
      reason: `Você atingiu o limite de ${simultaneousLimit} propostas simultâneas. Finalize ou decline algumas propostas para enviar mais.`,
      currentCount: activeCount,
      limit: simultaneousLimit,
    }
  }

  return {
    allowed: true,
    currentCount: activeCount,
    limit: simultaneousLimit,
  }
}

/**
 * Get active interests for display
 */
export async function getActiveInterests(professionalEmail: string): Promise<ActiveInterest[]> {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from("need_proposals")
    .select("id, need_id, professional_email, created_at, status")
    .eq("professional_email", professionalEmail)
    .eq("type", "interest_only")
    .in("status", ["pending", "viewed"])
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error getting active interests:", error)
    return []
  }

  return data || []
}
