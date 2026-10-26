"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/stripe-subscription-sync"
import { assertSlotAvailableForNeed } from "@/lib/simultaneous-interests"

const RECONFIRMABLE_STATUSES = ["interested", "pending"]

export interface PendingReconfirmation {
  needId: string
  proposalIds: string[]
  requestedAt: string
  title: string
  description: string
  category: string
  location: string
  isRemote: boolean
  image: string | null
}

async function getSessionUser() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email?.trim().toLowerCase()
  if (!email) throw new Error("Faça login para continuar.")
  return { email, id: data.user!.id }
}

/** Requests that reopened after the chosen professional cancelled and still await this professional's answer. */
export async function getPendingReconfirmations(): Promise<PendingReconfirmation[]> {
  const { email } = await getSessionUser()
  const admin = createAdminClient()

  const { data: proposals, error } = await admin
    .from("need_proposals")
    .select("id, need_id, reconfirm_requested_at")
    .ilike("professional_email", email)
    .in("status", RECONFIRMABLE_STATUSES)
    .not("reconfirm_requested_at", "is", null)

  if (error) throw new Error(`Falha ao carregar pedidos: ${error.message}`)
  if (!proposals?.length) return []

  const needIds = [...new Set(proposals.map((p) => String(p.need_id)))]
  const { data: needs, error: needsError } = await admin
    .from("needs")
    .select("id, title, description, category, city, neighborhood, state, is_remote, images, status")
    .in("id", needIds)
    .eq("status", "aberto")

  if (needsError) throw new Error(`Falha ao carregar pedidos: ${needsError.message}`)

  return (needs || [])
    .map((need) => {
      const own = proposals.filter((p) => String(p.need_id) === String(need.id))
      const location = need.is_remote
        ? "Atendimento online"
        : [need.neighborhood, need.city, need.state].filter(Boolean).join(", ")
      return {
        needId: String(need.id),
        proposalIds: own.map((p) => String(p.id)),
        requestedAt: own.map((p) => String(p.reconfirm_requested_at)).sort()[0],
        title: String(need.title || "Serviço"),
        description: String(need.description || ""),
        category: String(need.category || ""),
        location,
        isRemote: Boolean(need.is_remote),
        image: Array.isArray(need.images) && need.images.length ? String(need.images[0]) : null,
      }
    })
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))
}

/**
 * keep=true re-occupies a simultaneous slot (subject to the plan limit);
 * keep=false withdraws without any hold, since the professional did nothing wrong.
 */
export async function respondToReconfirmation(params: { needId: string; keep: boolean }): Promise<void> {
  const { email, id } = await getSessionUser()
  const admin = createAdminClient()

  const { data: proposals, error } = await admin
    .from("need_proposals")
    .select("id")
    .eq("need_id", params.needId)
    .ilike("professional_email", email)
    .in("status", RECONFIRMABLE_STATUSES)
    .not("reconfirm_requested_at", "is", null)

  if (error) throw new Error(`Falha ao responder: ${error.message}`)
  const proposalIds = (proposals || []).map((p) => String(p.id))
  if (!proposalIds.length) return

  if (params.keep) {
    const { data: need } = await admin.from("needs").select("status").eq("id", params.needId).maybeSingle()
    if (need?.status !== "aberto") throw new Error("Este pedido não está mais disponível.")

    await assertSlotAvailableForNeed({ professionalEmail: email, needId: params.needId, authUserId: id })

    const { error: keepError } = await admin
      .from("need_proposals")
      .update({ reconfirm_requested_at: null })
      .in("id", proposalIds)
    if (keepError) throw new Error(`Falha ao manter interesse: ${keepError.message}`)
    return
  }

  const { error: dropError } = await admin
    .from("need_proposals")
    .update({ status: "declined_by_professional", reconfirm_requested_at: null })
    .in("id", proposalIds)
  if (dropError) throw new Error(`Falha ao retirar interesse: ${dropError.message}`)
}
