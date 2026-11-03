/**
 * Once the requester has opened the chat, the professional must wait this long after showing interest to
 * withdraw. Otherwise they could talk, give up right away and take another request.
 */
export const INTEREST_WITHDRAW_WAIT_MS = 2 * 60 * 60 * 1000

/** After sending a bid, withdrawing is locked for this long so the requester can answer. */
export const BID_RESPONSE_LOCK_MS = 30 * 60 * 1000

export type WithdrawAllowedReason = "not_viewed" | "interest_timeout" | "bid_declined" | "bid_timeout"
export type WithdrawLockedReason = "interest_wait" | "bid_pending"

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
 * - No bid: allowed right away while the requester hasn't opened the chat; after that, only 2h after
 *   showing interest.
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

  if (!requesterViewedAt) {
    return { allowed: true, reason: "not_viewed" }
  }

  const unlockAt = Date.parse(interestSentAt) + INTEREST_WITHDRAW_WAIT_MS
  return now >= unlockAt
    ? { allowed: true, reason: "interest_timeout" }
    : { allowed: false, reason: "interest_wait", availableAt: new Date(unlockAt).toISOString() }
}

export function describeWithdrawLock(policy: Extract<WithdrawPolicy, { allowed: false }>): string {
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(policy.availableAt))

  return policy.reason === "bid_pending"
    ? `Lance enviado. Aguarde a resposta do cliente; você poderá desistir a partir das ${time}.`
    : `O cliente já visualizou seu interesse. Você poderá desistir a partir das ${time} (2 horas após manifestar interesse).`
}
