import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * After the requester confirms they still need the service (or accepts a professional), they can't cancel
 * for this long. It matches the longest wait a professional faces when dropping out on their own, so
 * asking the requester to cancel is never a faster way to free a slot.
 */
export const REQUESTER_CANCEL_LOCK_MS = 2 * 60 * 60 * 1000

export async function getRequesterCancelLockedUntil(
  supabase: SupabaseClient,
  needId: string,
  confirmedAt: string | null,
): Promise<string | null> {
  const { data: accepted } = await supabase
    .from("need_proposals")
    .select("accepted_at")
    .eq("need_id", needId)
    .eq("status", "accepted_by_requester")
    .not("accepted_at", "is", null)
    .order("accepted_at", { ascending: false })
    .limit(1)

  const commitmentTimes = [confirmedAt, accepted?.[0]?.accepted_at]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)

  if (!commitmentTimes.length) return null
  const lockedUntil = Math.max(...commitmentTimes) + REQUESTER_CANCEL_LOCK_MS
  return lockedUntil > Date.now() ? new Date(lockedUntil).toISOString() : null
}

export function formatCancelUnlockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
}
