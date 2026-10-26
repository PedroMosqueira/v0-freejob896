import { createAdminClient } from "./stripe-subscription-sync"
import { PLAN_FEATURES, type SubscriptionPlan } from "./subscription-manager"
import { PAID_SUBSCRIPTION_STATUSES, isSubscriptionExpired } from "./subscription-status"

/** How long a slot stays occupied after the professional cancels on their own. */
export const PROFESSIONAL_CANCEL_HOLD_MS = 2 * 60 * 60 * 1000

export interface ActiveInterestsSummary {
  /** Services occupying a slot right now (active + held after cancelling). */
  count: number
  /** Of those, how many are only held by the 2h post-cancellation rule. */
  heldCount: number
  /** ISO time when the earliest held slot is released, if any. */
  nextReleaseAt: string | null
  /** Requests currently occupying one of those slots. */
  occupiedNeedIds: string[]
}

// The professional ended it: the slot stays held for 2h so cancelling a
// service arranged over chat cannot be used to take on unlimited work.
const PROFESSIONAL_CANCELLED_STATUSES = new Set([
  "declined_by_professional",
  "declined_by_provider",
  "cancelled_by_provider",
  "cancelled",
])

// The requester ended it or the work is done: released immediately.
const RELEASED_STATUSES = new Set(["declined_by_requester", "cancelled_by_requester", "completed"])

const ACCEPTED_STATUSES = new Set(["accepted_by_requester", "accepted_by_provider", "accepted_by_professional"])

const OPEN_NEED_STATUSES = new Set(["aberto"])
// "aguardando_avaliacao" is deliberately absent: once the professional marks the
// job done, the slot is released while the requester reviews it.
const IN_PROGRESS_NEED_STATUSES = new Set(["aceito", "em_andamento"])
// The requester cancelled the whole request: everyone gets their slot back.
const REQUESTER_CANCELLED_NEED_STATUSES = new Set(["cancelado"])

type SlotState = { kind: "free" } | { kind: "active" } | { kind: "held"; until: number }

interface ProposalRow {
  need_id: string | null
  status: string | null
  cancelled_at: string | null
}

function slotStateFor(proposal: ProposalRow, needStatus: string | undefined, now: number): SlotState {
  const status = String(proposal.status ?? "")

  if (!needStatus || REQUESTER_CANCELLED_NEED_STATUSES.has(needStatus)) return { kind: "free" }

  if (PROFESSIONAL_CANCELLED_STATUSES.has(status)) {
    const cancelledAt = proposal.cancelled_at ? Date.parse(proposal.cancelled_at) : Number.NaN
    // Rows cancelled before cancelled_at existed have no timestamp; treat them as released.
    if (Number.isNaN(cancelledAt)) return { kind: "free" }
    const until = cancelledAt + PROFESSIONAL_CANCEL_HOLD_MS
    return until > now ? { kind: "held", until } : { kind: "free" }
  }

  if (RELEASED_STATUSES.has(status)) return { kind: "free" }
  if (OPEN_NEED_STATUSES.has(needStatus)) return { kind: "active" }
  // Once a request is in progress only the chosen professional keeps the slot.
  if (IN_PROGRESS_NEED_STATUSES.has(needStatus) && ACCEPTED_STATUSES.has(status)) return { kind: "active" }
  return { kind: "free" }
}

/**
 * Counts slots per service (need), not per proposal: interest, visit and bid
 * proposals on the same request occupy a single slot. Uses the service role
 * because RLS on needs would hide rows; always scoped to one professional.
 * Throws on database errors so callers never treat a failure as "0 active".
 */
export async function getActiveInterestsSummary(professionalEmail: string): Promise<ActiveInterestsSummary> {
  const email = professionalEmail.trim().toLowerCase()
  const empty: ActiveInterestsSummary = { count: 0, heldCount: 0, nextReleaseAt: null, occupiedNeedIds: [] }
  if (!email) return empty

  const supabase = createAdminClient()

  const { data: proposals, error } = await supabase
    .from("need_proposals")
    .select("need_id, status, cancelled_at")
    .ilike("professional_email", email)

  if (error) throw new Error(`Failed to load proposals: ${error.message}`)
  if (!proposals?.length) return empty

  const needIds = [...new Set(proposals.map((p) => p.need_id).filter((id): id is string => Boolean(id)))]
  if (!needIds.length) return empty

  const { data: needs, error: needsError } = await supabase.from("needs").select("id, status").in("id", needIds)
  if (needsError) throw new Error(`Failed to load needs: ${needsError.message}`)

  const needStatusById = new Map((needs || []).map((n) => [String(n.id), String(n.status)]))
  const now = Date.now()
  const stateByNeed = new Map<string, SlotState>()

  for (const proposal of proposals as ProposalRow[]) {
    if (!proposal.need_id) continue
    const needId = String(proposal.need_id)
    const next = slotStateFor(proposal, needStatusById.get(needId), now)
    const current = stateByNeed.get(needId) ?? { kind: "free" }

    if (current.kind === "active" || next.kind === "free") {
      if (!stateByNeed.has(needId)) stateByNeed.set(needId, current)
      continue
    }
    if (next.kind === "active" || current.kind === "free") {
      stateByNeed.set(needId, next)
      continue
    }
    stateByNeed.set(needId, { kind: "held", until: Math.max(current.until, next.until) })
  }

  let count = 0
  let heldCount = 0
  let nextRelease: number | null = null
  const occupiedNeedIds: string[] = []

  for (const [needId, state] of stateByNeed) {
    if (state.kind === "free") continue
    count++
    occupiedNeedIds.push(needId)
    if (state.kind === "held") {
      heldCount++
      nextRelease = nextRelease === null ? state.until : Math.min(nextRelease, state.until)
    }
  }

  return {
    count,
    heldCount,
    nextReleaseAt: nextRelease === null ? null : new Date(nextRelease).toISOString(),
    occupiedNeedIds,
  }
}

export async function getActiveInterestsCount(professionalEmail: string): Promise<number> {
  const summary = await getActiveInterestsSummary(professionalEmail)
  return summary.count
}

function formatReleaseTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso))
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
    return { allowed: false, reason: "Plano não encontrado" }
  }

  const simultaneousLimit = planLimits.simultaneous_interests
  const summary = await getActiveInterestsSummary(professionalEmail)

  if (simultaneousLimit === -1) {
    return { allowed: true, currentCount: summary.count, limit: -1 }
  }

  if (summary.count >= simultaneousLimit) {
    const holdNote = summary.nextReleaseAt
      ? ` Serviços que você cancelou continuam ocupando a vaga por 2h; a próxima vaga libera às ${formatReleaseTime(summary.nextReleaseAt)}.`
      : " Conclua um serviço ou aguarde o cliente encerrar um pedido para liberar uma vaga."
    return {
      allowed: false,
      reason: `Você atingiu o limite de ${simultaneousLimit} serviços simultâneos.${holdNote}`,
      currentCount: summary.count,
      limit: simultaneousLimit,
    }
  }

  return { allowed: true, currentCount: summary.count, limit: simultaneousLimit }
}

async function resolveSimultaneousLimit(professionalEmail: string, authUserId?: string): Promise<number> {
  const supabase = createAdminClient()
  const { data: users } = await supabase.from("users").select("id").ilike("email", professionalEmail).limit(5)
  const userIds = [...new Set([...(users || []).map((u) => String(u.id)), authUserId].filter(Boolean))] as string[]

  let planSlug = "free"
  if (userIds.length) {
    const { data: subscriptions } = await supabase
      .from("user_subscriptions")
      .select("plan_id, current_period_end")
      .in("user_id", userIds)
      .in("status", [...PAID_SUBSCRIPTION_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)
    const subscription = subscriptions?.[0]
    if (subscription && !isSubscriptionExpired(subscription.current_period_end)) {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("slug")
        .eq("id", subscription.plan_id)
        .maybeSingle()
      planSlug = plan?.slug?.trim().toLowerCase() || "free"
    }
  }

  // Same defaults as canUserExpressInterest so every entry point enforces one limit.
  if (planSlug === "free") return PLAN_FEATURES.free?.limits?.simultaneous_interests ?? 1
  return PLAN_FEATURES[planSlug as SubscriptionPlan]?.limits?.simultaneous_interests ?? 8
}

/**
 * Server-side guard for every way a professional can take on a request (bid, visit, direct acceptance),
 * so slots held for 2h after cancelling can't be bypassed by skipping the interest flow.
 * Acting again on a request that already occupies a slot never needs a new one.
 */
export async function assertSlotAvailableForNeed(params: {
  professionalEmail: string
  needId: string
  authUserId?: string
}): Promise<void> {
  const email = params.professionalEmail.trim().toLowerCase()
  const summary = await getActiveInterestsSummary(email)
  if (summary.occupiedNeedIds.includes(String(params.needId))) return

  const limit = await resolveSimultaneousLimit(email, params.authUserId)
  if (limit === -1 || summary.count < limit) return

  const holdNote = summary.nextReleaseAt
    ? ` Serviços que você cancelou continuam ocupando a vaga por 2h; a próxima vaga libera às ${formatReleaseTime(summary.nextReleaseAt)}.`
    : " Conclua um serviço ou aguarde o cliente encerrar um pedido para liberar uma vaga."
  throw new Error(`Você atingiu o limite de ${limit} serviços simultâneos.${holdNote}`)
}
