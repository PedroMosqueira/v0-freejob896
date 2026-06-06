import { createSupabaseServerClient } from "@/lib/supabase/server"

export interface InterestReleaseResult {
  shouldRelease: boolean
  reason: "immediate" | "timeout_reached" | "completed" | "none"
  releasedAt?: Date
}

/**
 * Check if a cancelled interest should be released from simultaneous limit
 *
 * Release conditions:
 * 1. Cancelled before requester viewed → release immediately
 * 2. Cancelled after requester viewed + 2h has passed → release
 * 3. Proposal completed → release immediately (handled elsewhere)
 */
export async function shouldReleaseInterest(proposalId: string): Promise<InterestReleaseResult> {
  const supabase = createSupabaseServerClient()

  const { data: proposal, error } = await supabase
    .from("need_proposals")
    .select("id, status, cancelled_at, cancelled_before_viewed, viewed_by_requester_at")
    .eq("id", proposalId)
    .single()

  if (error || !proposal) {
    console.error("[v0] Error fetching proposal:", error)
    return { shouldRelease: false, reason: "none" }
  }

  // If not cancelled, no release needed
  if (proposal.status !== "cancelled" || !proposal.cancelled_at) {
    return { shouldRelease: false, reason: "none" }
  }

  // Case 1: Cancelled before requester viewed
  if (proposal.cancelled_before_viewed) {
    return {
      shouldRelease: true,
      reason: "immediate",
      releasedAt: new Date(proposal.cancelled_at),
    }
  }

  // Case 2: Cancelled after viewed - check 2h timeout
  if (proposal.viewed_by_requester_at) {
    const cancelledTime = new Date(proposal.cancelled_at)
    const now = new Date()
    const twoHoursInMs = 2 * 60 * 60 * 1000

    const timeDiff = now.getTime() - cancelledTime.getTime()

    if (timeDiff >= twoHoursInMs) {
      return {
        shouldRelease: true,
        reason: "timeout_reached",
        releasedAt: new Date(cancelledTime.getTime() + twoHoursInMs),
      }
    }
  }

  return { shouldRelease: false, reason: "none" }
}

/**
 * Count active interests for a professional
 * Only counts proposals that are NOT released yet
 */
export async function countActiveInterests(professionalEmail: string): Promise<number> {
  const supabase = createSupabaseServerClient()

  // Get all proposals that should still count toward simultaneous limit
  const { data: proposals, error } = await supabase
    .from("need_proposals")
    .select("id, status, cancelled_at, cancelled_before_viewed")
    .eq("professional_email", professionalEmail)
    .in("status", ["pending", "accepted", "completed"])

  if (error) {
    console.error("[v0] Error counting active interests:", error)
    return 0
  }

  // Filter out proposals that should be released
  let activeCount = 0

  for (const proposal of proposals || []) {
    if (proposal.status === "completed") {
      // Completed proposals don't count (should be handled by status)
      continue
    }

    if (proposal.status === "cancelled") {
      // Don't count cancelled proposals
      continue
    }

    activeCount++
  }

  return activeCount
}

/**
 * Mark a proposal as cancelled and track if it was before viewing
 */
export async function cancelInterest(
  proposalId: string,
  beforeViewed: boolean = true
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
