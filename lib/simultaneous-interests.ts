import { createSupabaseServerClient } from "./supabase/server"
import { PLAN_FEATURES, type SubscriptionPlan } from "./subscription-manager"

export interface ActiveInterest {
  id: string
  need_id: string
  professional_email: string
  created_at: string
  status: string
  cancelled_at?: string
  cancelled_before_viewed?: boolean
  viewed_by_requester_at?: string
}

/**
 * Check if a cancelled interest should be released from simultaneous limit
 * Release conditions:
 * 1. Cancelled before requester viewed → release immediately
 * 2. Cancelled after requester viewed + 2h has passed → release
 * 3. Completed proposal → release immediately (status check only)
 */
async function shouldReleaseInterest(proposal: any): Promise<boolean> {
  if (proposal.status === "completed") {
    return true // Completed proposals don't count
  }

  if (proposal.status !== "cancelled" || !proposal.cancelled_at) {
    return false // Not cancelled, so doesn't get released
  }

  // Case 1: Cancelled before requester viewed → release immediately
  if (proposal.cancelled_before_viewed === true) {
    return true
  }

  // Case 2: Cancelled after viewed - check 2h timeout
  if (proposal.viewed_by_requester_at || proposal.cancelled_before_viewed === false) {
    const cancelledTime = new Date(proposal.cancelled_at).getTime()
    const now = new Date().getTime()
    const twoHoursInMs = 2 * 60 * 60 * 1000

    return now - cancelledTime >= twoHoursInMs
  }

  return false
}

/**
 * Get count of active interests that count toward simultaneous limit
 */
export async function getActiveInterestsCount(professionalEmail: string): Promise<number> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from("need_proposals")
    .select(
      "id, status, cancelled_at, cancelled_before_viewed, viewed_by_requester_at, type"
    )
    .eq("professional_email", professionalEmail)

  if (error) {
    console.error("[v0] Error getting active interests count:", error)
    return 0
  }

  let activeCount = 0

  for (const proposal of data || []) {
    // Skip if not an interest
    if (proposal.type !== "interest_only") {
      continue
    }

    // Check if this proposal should be released
    const isReleased = await shouldReleaseInterest(proposal)
    if (isReleased) {
      continue // Don't count released proposals
    }

    // Count all other statuses that aren't yet released
    if (proposal.status !== "completed") {
      activeCount++
    }
  }

  return activeCount
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
    .select(
      "id, need_id, professional_email, created_at, status, type, cancelled_at, cancelled_before_viewed, viewed_by_requester_at"
    )
    .eq("professional_email", professionalEmail)
    .eq("type", "interest_only")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error getting active interests:", error)
    return []
  }

  const activeInterests: ActiveInterest[] = []

  for (const proposal of data || []) {
    // Skip released proposals
    const isReleased = await shouldReleaseInterest(proposal)
    if (isReleased) {
      continue
    }

    // Skip completed proposals
    if (proposal.status === "completed") {
      continue
    }

    activeInterests.push(proposal)
  }

  return activeInterests
}

/**
 * Cancel an interest and mark if it was before requester viewed
 */
export async function cancelInterest(
  proposalId: string,
  beforeViewed: boolean = true,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient()

  const { error } = await supabase
    .from("need_proposals")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_before_viewed: beforeViewed,
    })
    .eq("id", proposalId)

  if (error) {
    console.error("[v0] Error cancelling interest:", error)
    return { success: false, error: error.message }
  }

  console.log(`[v0] Interest cancelled: ${proposalId}, before viewed: ${beforeViewed}`)
  return { success: true }
}

/**
 * Mark proposal as viewed by requester
 */
export async function markProposalAsViewed(proposalId: string): Promise<void> {
  const supabase = createSupabaseServerClient()

  await supabase
    .from("need_proposals")
    .update({
      viewed_by_requester_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
}

/**
 * Complete a proposal (professional finished the work)
 */
export async function completeProposal(proposalId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient()

  const { error } = await supabase
    .from("need_proposals")
    .update({
      status: "completed",
    })
    .eq("id", proposalId)

  if (error) {
    console.error("[v0] Error completing proposal:", error)
    return { success: false, error: error.message }
  }

  console.log(`[v0] Proposal completed: ${proposalId}`)
  return { success: true }
}
