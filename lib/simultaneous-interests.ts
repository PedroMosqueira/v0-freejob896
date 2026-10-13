import { createSupabaseServerClient } from "./supabase/server"
import { createAdminClient } from "./stripe-subscription-sync"
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

// Proposal statuses that end an interest and free a simultaneous slot.
const RELEASED_PROPOSAL_STATUSES = new Set([
  "declined_by_requester",
  "declined_by_provider",
  "declined_by_professional",
  "cancelled_by_requester",
  "cancelled_by_provider",
  "cancelled",
  "completed",
])

const ACCEPTED_PROPOSAL_STATUSES = new Set([
  "accepted_by_requester",
  "accepted_by_provider",
  "accepted_by_professional",
])

// Need statuses where the professional is still waiting or working.
const OPEN_NEED_STATUSES = new Set(["aberto"])
const IN_PROGRESS_NEED_STATUSES = new Set(["aceito", "em_andamento"])

/**
 * An interest occupies a slot while its need is open and the proposal is
 * not declined/cancelled, or while the professional was accepted and the
 * service is in progress. Concluded, cancelled or deleted needs never count,
 * nor do interests on needs where another professional was chosen.
 */
function occupiesSlot(proposalStatus: string, needStatus: string | undefined): boolean {
  if (!needStatus || RELEASED_PROPOSAL_STATUSES.has(proposalStatus)) return false
  if (OPEN_NEED_STATUSES.has(needStatus)) return true
  if (IN_PROGRESS_NEED_STATUSES.has(needStatus)) return ACCEPTED_PROPOSAL_STATUSES.has(proposalStatus)
  return false
}

/**
 * Lists the professional's interests that count toward the simultaneous limit.
 * Uses the service role because it also runs for counters where RLS on needs
 * would hide rows; it is always scoped to a single professional email.
 */
async function fetchSlotOccupyingInterests(professionalEmail: string) {
  const email = professionalEmail.trim().toLowerCase()
  if (!email) return []

  const supabase = createAdminClient()

  const { data: proposals, error } = await supabase
    .from("need_proposals")
    .select("id, need_id, professional_email, created_at, status")
    .ilike("professional_email", email)
    .eq("type", "interest_only")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load interests: ${error.message}`)
  }
  if (!proposals?.length) return []

  const needIds = [...new Set(proposals.map((p) => p.need_id).filter(Boolean))]
  const { data: needs, error: needsError } = await supabase.from("needs").select("id, status").in("id", needIds)

  if (needsError) {
    throw new Error(`Failed to load needs: ${needsError.message}`)
  }

  const needStatusById = new Map((needs || []).map((n) => [String(n.id), String(n.status)]))

  return proposals.filter((p) => occupiesSlot(String(p.status), needStatusById.get(String(p.need_id))))
}

/**
 * Get count of active interests that count toward simultaneous limit.
 * Throws on database errors so callers never treat a failure as "0 active".
 */
export async function getActiveInterestsCount(professionalEmail: string): Promise<number> {
  const interests = await fetchSlotOccupyingInterests(professionalEmail)
  return interests.length
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
  try {
    return await fetchSlotOccupyingInterests(professionalEmail)
  } catch (error) {
    console.error("[simultaneous-interests] Error getting active interests:", error)
    return []
  }
}

/**
 * Cancel an interest and mark if it was before requester viewed
 */
export async function cancelInterest(
  proposalId: string,
  beforeViewed: boolean = true,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()

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
  const supabase = await createSupabaseServerClient()

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
  const supabase = await createSupabaseServerClient()

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
