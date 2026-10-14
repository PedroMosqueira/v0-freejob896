/** Before the requester views the interest, the professional must wait this long to withdraw. */
export const UNVIEWED_INTEREST_WAIT_MS = 2 * 60 * 60 * 1000

/** After sending a bid, withdrawing is locked for this long so the requester can answer. */
export const BID_RESPONSE_LOCK_MS = 30 * 60 * 1000

export type WithdrawAllowedReason = "viewed" | "unviewed_timeout" | "bid_declined" | "bid_timeout"
export type WithdrawLockedReason = "awaiting_view" | "bid_pending"

export type WithdrawPolicy =
  | { allowed: true; reason: WithdrawAllowedReason }
  | { allowed: false; reason: WithdrawLockedReason; availableAt: string }

export interface WithdrawPolicyInput {
  interestSentAt: string
  requesterViewedAt: string | null
  latestBid: { sentAt: string; status: string } | null
  now?: number
}

/**
 * Decides whether a professional may withdraw from an open request.
 * - Pending bid: locked for 30 min after the bid (a new bid restarts the clock),
 *   then optional; the bid stays available to the requester either way.
 * - Bid declined by the requester: allowed.
 * - No bid: allowed once the requester has viewed the interest, or 2h after
 *   sending it if they never do.
 */
export function getWithdrawPolicy({
  interestSentAt,
  requesterViewedAt,
  latestBid,
  now = Date.now(),
}: WithdrawPolicyInput): WithdrawPolicy {
  if (latestBid?.status === "pending") {
    const unlockAt = Date.parse(latestBid.sentAt) + BID_RESPONSE_LOCK_MS
    return now >= unlockAt
      ? { allowed: true, reason: "bid_timeout" }
      : { allowed: false, reason: "bid_pending", availableAt: new Date(unlockAt).toISOString() }
  }

  if (latestBid?.status === "declined_by_requester") {
    return { allowed: true, reason: "bid_declined" }
  }

  if (requesterViewedAt) {
    return { allowed: true, reason: "viewed" }
  }

  const unlockAt = Date.parse(interestSentAt) + UNVIEWED_INTEREST_WAIT_MS
  return now >= unlockAt
    ? { allowed: true, reason: "unviewed_timeout" }
    : { allowed: false, reason: "awaiting_view", availableAt: new Date(unlockAt).toISOString() }
}

export function describeWithdrawLock(policy: Extract<WithdrawPolicy, { allowed: false }>): string {
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(policy.availableAt))

  return policy.reason === "bid_pending"
    ? `Lance enviado. Aguarde a resposta do cliente; você poderá desistir a partir das ${time}.`
    : `Você poderá desistir quando o cliente visualizar seu interesse ou a partir das ${time}.`
}
