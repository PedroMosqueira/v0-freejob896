/**
 * After the requester confirms they still need the service (before first seeing the chat), they can't cancel
 * for this long. Only that confirmation counts — accepting a professional later doesn't restart it.
 * It matches the longest wait a professional faces when dropping out on their own, so asking the requester
 * to cancel is never a faster way to free a slot.
 */
export const REQUESTER_CANCEL_LOCK_MS = 2 * 60 * 60 * 1000

export function getRequesterCancelLockedUntil(confirmedAt: string | null): string | null {
  if (!confirmedAt) return null
  const confirmedTime = new Date(confirmedAt).getTime()
  if (!Number.isFinite(confirmedTime)) return null
  const lockedUntil = confirmedTime + REQUESTER_CANCEL_LOCK_MS
  return lockedUntil > Date.now() ? new Date(lockedUntil).toISOString() : null
}

export function formatCancelUnlockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
}
