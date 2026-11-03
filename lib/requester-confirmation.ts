"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getRequesterCancelLockedUntil } from "@/lib/requester-cancel-lock"

const CONFIRMATION_STATUSES = ["aberto", "visita-proposta"]
const CLOSED_STATUSES = ["aguardando_avaliacao", "concluido", "nao_realizado", "cancelado"]

export interface RequesterCancelState {
  /** The requester hasn't yet confirmed they still need the service; asked before the first chat opens. */
  needsConfirmation: boolean
  /** While set and in the future, the requester can't cancel the request. */
  cancelLockedUntil: string | null
}

async function loadOwnNeed(needId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data: need } = await supabase
    .from("needs")
    .select("requester_email, status, requester_confirmed_at")
    .eq("id", needId)
    .maybeSingle()

  if (!need || String(need.requester_email || "").toLowerCase() !== user.email.toLowerCase()) return null
  return { supabase, need }
}

export async function getRequesterCancelState(needId: string): Promise<RequesterCancelState> {
  const context = await loadOwnNeed(needId)
  if (!context || CLOSED_STATUSES.includes(context.need.status)) {
    return { needsConfirmation: false, cancelLockedUntil: null }
  }

  const confirmedAt = context.need.requester_confirmed_at ?? null
  return {
    needsConfirmation: CONFIRMATION_STATUSES.includes(context.need.status) && !confirmedAt,
    cancelLockedUntil: getRequesterCancelLockedUntil(confirmedAt),
  }
}

export async function confirmServiceStillNeeded(needId: string): Promise<{ ok: boolean; error?: string }> {
  const context = await loadOwnNeed(needId)
  if (!context) return { ok: false, error: "Pedido não encontrado." }
  if (context.need.requester_confirmed_at) return { ok: true }

  const { error } = await context.supabase
    .from("needs")
    .update({ requester_confirmed_at: new Date().toISOString() })
    .eq("id", needId)
    .is("requester_confirmed_at", null)

  if (error) {
    console.error("[confirmServiceStillNeeded]", error)
    return { ok: false, error: "Não foi possível confirmar. Tente novamente." }
  }
  return { ok: true }
}
