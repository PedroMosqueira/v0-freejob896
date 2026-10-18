"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getActiveInterestsCount } from "./simultaneous-interests"
import { addNeedProposal } from "./needs-store"
import { PLAN_FEATURES } from "./subscription-manager"
import { PAID_SUBSCRIPTION_STATUSES, isSubscriptionExpired } from "./subscription-status"

const MAX_FREE_INTERESTS = 3

export async function canUserExpressInterest(userEmail: string): Promise<{
  canExpressInterest: boolean
  reason?: string
  freeInterestsUsed?: number
  freeInterestsRemaining?: number
  isProfessional?: boolean
  phoneVerified?: boolean
  hasActiveSubscription?: boolean
  needsPhoneValidation?: boolean
  needsUpgrade?: boolean
  /** True when this interest must consume one free credit (no paid plan). */
  usesFreeCredit?: boolean
}> {
  try {
    console.log("[v0-server] canUserExpressInterest - checking email:", userEmail)
    const supabase = await createSupabaseServerClient()

    // Usar o usuário autenticado quando disponível para evitar escolher outro
    // registro em caso de e-mails duplicados na tabela users.
    const { data: authData } = await supabase.auth.getUser()
    const authenticatedUserId = authData.user?.id
    const userFields = "id, is_professional, free_interests_remaining, total_interests_sent, phone_verified"

    // O mesmo critério usado pelo frontend: o e-mail é a identidade estável
    // do cadastro em `users`. O auth.uid() pode ser diferente do id legado.
    const byEmail = await supabase
      .from("users")
      .select(userFields)
      .eq("email", userEmail)
      .order("phone_verified", { ascending: false })
      .limit(5)

    let users = byEmail.data
    let userError = byEmail.error

    // Fallback para bases em que o e-mail do cadastro divergiu do e-mail da sessão.
    if (!userError && (!users || users.length === 0) && authenticatedUserId) {
      const byAuthId = await supabase
        .from("users")
        .select(userFields)
        .eq("id", authenticatedUserId)
        .limit(1)
      users = byAuthId.data
      userError = byAuthId.error
    }

    if (!userError && users) {
      users = users.sort((a, b) => Number(Boolean(b.phone_verified)) - Number(Boolean(a.phone_verified)))
    }

    console.log("[v0-server] Query result - found users:", users?.length, "error:", userError?.message, "code:", userError?.code)
    if (users && users.length > 0) {
      console.log("[v0-server] User candidates:", users.map((candidate) => ({
        id: candidate.id,
        phone_verified: candidate.phone_verified,
        is_professional: candidate.is_professional,
      })))
    }

    if (userError) {
      const databaseError = new Error(
        [userError.message, userError.details, userError.hint, userError.code]
          .filter(Boolean)
          .join(" | ") || "Falha ao consultar o cadastro do usuário",
      )
      console.error("[v0-server] User query failed:", {
        message: databaseError.message,
        code: userError.code,
        details: userError.details,
        hint: userError.hint,
      })
      throw databaseError
    }

    if (!users || users.length === 0) {
      console.log("[v0-server] User not found")
      const result = {
        canExpressInterest: false,
        reason: "Usuário não encontrado",
        phoneVerified: false,
      }
      console.log("[v0-browser] Result for", userEmail, ":", result)
      return result
    }

    const user = users[0]

    // Verificar se tem telefone validado
    const phoneIsVerified = user.phone_verified === true || user.phone_verified === "true" || user.phone_verified === 1

    if (!phoneIsVerified) {
      console.log("[v0-server] Phone not verified - blocking")
      const result = {
        canExpressInterest: false,
        reason: "Você precisa validar seu telefone primeiro",
        needsPhoneValidation: true,
        isProfessional: user.is_professional || false,
        phoneVerified: false,
      }
      console.log("[v0-browser] PHONE NOT VERIFIED - Result for", userEmail, ":", result)
      return result
    }

    // Regra única para todos os usuários (profissionais ou não):
    // 1) plano pago ativo  -> pode, sem consumir crédito gratuito
    // 2) créditos gratuitos -> pode, consumindo 1 crédito
    // 3) nenhum dos dois    -> precisa assinar um plano
    const isProfessional = Boolean(user.is_professional)
    const freeInterestsRemaining = Math.max(0, user.free_interests_remaining ?? 0)

    const subscriptionUserIds = [user.id, authenticatedUserId].filter(
      (id, index, ids): id is string => Boolean(id) && ids.indexOf(id) === index,
    )

    const { data: subscriptions, error: subError } = await supabase
      .from("user_subscriptions")
      .select("id, user_id, status, plan_id, current_period_end")
      .in("user_id", subscriptionUserIds)
      .in("status", [...PAID_SUBSCRIPTION_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)

    if (subError) {
      console.error("[v0-server] Subscription query failed:", subError.message, subError.code)
    }

    const subscription = !subError && subscriptions && subscriptions.length > 0 ? subscriptions[0] : null
    let planSlug = "free"

    if (subscription && !isSubscriptionExpired(subscription.current_period_end)) {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("slug")
        .eq("id", subscription.plan_id)
        .maybeSingle()
      planSlug = plan?.slug?.trim().toLowerCase() || "free"
    }

    // Só concede acesso pago quando o plano vinculado não é o gratuito.
    const hasActiveSubscription = planSlug !== "free"

    if (hasActiveSubscription) {
      const simultaneousLimit =
        PLAN_FEATURES[planSlug as keyof typeof PLAN_FEATURES]?.limits?.simultaneous_interests ?? 8
      
      // Verificar limite de propostas simultâneas
      const activeCount = await getActiveInterestsCount(userEmail)
      
      if (activeCount >= simultaneousLimit) {
        return {
          canExpressInterest: false,
          reason: `Você atingiu o limite de ${simultaneousLimit} proposta(s) simultânea(s) do seu plano. Aguarde a conclusão de uma.`,
          isProfessional,
          freeInterestsRemaining,
          phoneVerified: true,
          hasActiveSubscription: true,
        }
      }

      return {
        canExpressInterest: true,
        usesFreeCredit: false,
        isProfessional,
        freeInterestsRemaining,
        phoneVerified: true,
        hasActiveSubscription: true,
      }
    }

    if (freeInterestsRemaining > 0) {
      const activeCount = await getActiveInterestsCount(userEmail)
      const freeLimit = PLAN_FEATURES.free?.limits?.simultaneous_interests ?? 1

      if (activeCount >= freeLimit) {
        return {
          canExpressInterest: false,
          reason: `Você atingiu o limite de ${freeLimit} proposta(s) simultânea(s). Aguarde a conclusão de uma para continuar.`,
          isProfessional,
          freeInterestsRemaining,
          phoneVerified: true,
          hasActiveSubscription: false,
        }
      }

      return {
        canExpressInterest: true,
        usesFreeCredit: true,
        isProfessional,
        freeInterestsUsed: MAX_FREE_INTERESTS - freeInterestsRemaining,
        freeInterestsRemaining,
        phoneVerified: true,
        hasActiveSubscription: false,
      }
    }

    console.log("[v0-server] No paid plan and no free credits - upgrade required for", userEmail)
    return {
      canExpressInterest: false,
      reason: `As ${MAX_FREE_INTERESTS} propostas gratuitas deste telefone já foram usadas. Para continuar, é necessário um plano de assinatura.`,
      needsUpgrade: true,
      isProfessional,
      freeInterestsUsed: MAX_FREE_INTERESTS,
      freeInterestsRemaining: 0,
      phoneVerified: true,
      hasActiveSubscription: false,
    }
  } catch (error) {
    console.error("[v0-server] ERROR in canUserExpressInterest for", userEmail, ":", error)
    console.error("[v0-browser] ERROR CAUGHT - Check server logs for details")
    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
        ? Object.entries(error as Record<string, unknown>)
            .map(([key, value]) => `${key}: ${String(value)}`)
            .join(" | ")
        : String(error)
    return {
      canExpressInterest: false,
      reason: `Não foi possível verificar sua permissão. ${errorMessage || "Tente novamente."}`,
      // Um erro de consulta não significa que o telefone está pendente.
      // `needsPhoneValidation` só deve existir na resposta da checagem real.
    }
  }
}

export type ExpressInterestResult =
  | { success: true; proposalId: string; isProfessional: boolean }
  | {
      success: false
      reason: string
      needsPhoneValidation?: boolean
      needsUpgrade?: boolean
      alreadyInterested?: boolean
    }

/**
 * Single server-side entry point for "Tenho interesse": the permission check,
 * proposal insert and credit consumption run together so the client cannot
 * skip the check. The identity comes from the session, never from the caller.
 */
export async function expressInterest(needId: string): Promise<ExpressInterestResult> {
  try {
    if (!needId) {
      return { success: false, reason: "Pedido inválido." }
    }

    const supabase = await createSupabaseServerClient()
    const { data: authData } = await supabase.auth.getUser()
    const sessionEmail = authData.user?.email

    if (!sessionEmail) {
      return { success: false, reason: "Sua sessão expirou. Entre novamente para continuar." }
    }

    const { data: need, error: needError } = await supabase
      .from("needs")
      .select("id, requester_email")
      .eq("id", needId)
      .maybeSingle()

    if (needError || !need) {
      return { success: false, reason: "Pedido não encontrado." }
    }

    if (need.requester_email?.toLowerCase() === sessionEmail.toLowerCase()) {
      return { success: false, reason: "Você não pode manifestar interesse no seu próprio pedido." }
    }

    // A withdrawn interest (declined_by_professional) does not block expressing interest again.
    const { data: existing } = await supabase
      .from("need_proposals")
      .select("id")
      .eq("need_id", needId)
      .ilike("professional_email", sessionEmail)
      .neq("status", "declined_by_professional")
      .limit(1)

    if (existing && existing.length > 0) {
      return {
        success: false,
        alreadyInterested: true,
        reason: "Você já manifestou interesse neste pedido.",
      }
    }

    const permission = await canUserExpressInterest(sessionEmail)

    if (!permission.canExpressInterest) {
      return {
        success: false,
        reason: permission.reason || "Não foi possível verificar sua permissão. Tente novamente.",
        needsPhoneValidation: permission.needsPhoneValidation,
        needsUpgrade: permission.needsUpgrade,
      }
    }

    const proposal = await addNeedProposal({
      needId,
      professionalEmail: sessionEmail,
      type: "interest_only",
    })

    const counter = await incrementInterestCount(sessionEmail, Boolean(permission.usesFreeCredit))
    if (!counter.success) {
      console.error("[v0-server] Interest saved but credit counter failed:", counter.error)
    }

    return { success: true, proposalId: proposal.id, isProfessional: Boolean(permission.isProfessional) }
  } catch (error) {
    console.error("[v0-server] expressInterest failed:", error)
    return {
      success: false,
      reason: error instanceof Error ? error.message : "Erro ao manifestar interesse.",
    }
  }
}

export async function incrementInterestCount(userEmail: string, consumeFreeCredit = true): Promise<{
  success: boolean
  error?: string
  freeInterestsUsed?: number
  freeInterestsRemaining?: number
}> {
  try {
    const supabase = await createSupabaseServerClient()

    // Buscar dados do usuário
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("is_professional, free_interests_remaining, total_interests_sent")
      .eq("email", userEmail)
      .limit(1)

    if (userError || !users || users.length === 0) {
      return {
        success: false,
        error: "Usuário não encontrado",
      }
    }

    const user = users[0]

    const currentFreeRemaining = Math.max(0, user.free_interests_remaining ?? 0)
    const currentTotalSent = user.total_interests_sent ?? 0

    // Assinantes não gastam crédito gratuito; os demais gastam 1 por interesse.
    const newFreeRemaining =
      consumeFreeCredit && currentFreeRemaining > 0 ? currentFreeRemaining - 1 : currentFreeRemaining

    const { error: updateError } = await supabase
      .from("users")
      .update({
        free_interests_remaining: newFreeRemaining,
        total_interests_sent: currentTotalSent + 1,
      })
      .eq("email", userEmail)

    if (updateError) {
      console.error("Erro ao atualizar contadores:", updateError)
      return {
        success: false,
        error: "Erro ao registrar seu interesse",
      }
    }

    return {
      success: true,
      freeInterestsUsed: 3 - newFreeRemaining,
      freeInterestsRemaining: newFreeRemaining,
    }
  } catch (error) {
    console.error("Erro ao incrementar contador de interesses:", error)
    return {
      success: false,
      error: "Erro ao registrar seu interesse",
    }
  }
}
