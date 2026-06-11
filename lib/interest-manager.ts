"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getActiveInterestsCount } from "./simultaneous-interests"
import { PLAN_FEATURES } from "./subscription-manager"

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
}> {
  try {
    console.log("[v0-server] canUserExpressInterest - checking email:", userEmail)
    const supabase = await createSupabaseServerClient()

    // Buscar dados do usuário
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, is_professional, free_interests_remaining, total_interests_sent, phone_verified")
      .eq("email", userEmail)
      .limit(1)

    console.log("[v0-server] Query result - found users:", users?.length, "error:", userError?.message)
    if (users && users.length > 0) {
      console.log("[v0-server] User data:", { phone_verified: users[0].phone_verified, is_professional: users[0].is_professional })
    }

    if (userError) {
      throw userError
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
    if (!user.phone_verified) {
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

    console.log("[v0-server] Phone verified - proceeding")
    
    // Se não é profissional, pode expressar interesse
    if (!user.is_professional) {
      console.log("[v0-server] Non-professional user - returning success")
      const result = {
        canExpressInterest: true,
        isProfessional: false,
        phoneVerified: true,
      }
      console.log("[v0-browser] NON-PROFESSIONAL - Result for", userEmail, ":", result)
      return result
    }

    // Se é profissional, verifica se tem propostas gratuitas restantes
    const freeInterestsRemaining = user.free_interests_remaining ?? 3

    if (freeInterestsRemaining > 0) {
      // Verificar também limite de propostas simultâneas
      const activeCount = await getActiveInterestsCount(userEmail)
      const planLimit = PLAN_FEATURES.free?.limits?.simultaneous_interests ?? 1
      
      if (activeCount >= planLimit) {
        const result = {
          canExpressInterest: false,
          reason: `Você atingiu o limite de ${planLimit} proposta(s) simultânea(s). Aguarde a conclusão de uma para continuar.`,
          isProfessional: true,
          phoneVerified: true,
          freeInterestsRemaining,
          hasActiveSubscription: false,
        }
        console.log("[v0-browser] LIMIT REACHED - Result for", userEmail, ":", result)
        return result
      }
      
      const result = {
        canExpressInterest: true,
        isProfessional: true,
        freeInterestsUsed: 3 - freeInterestsRemaining,
        freeInterestsRemaining,
        phoneVerified: true,
        hasActiveSubscription: false,
      }
      console.log("[v0-browser] PROFESSIONAL WITH FREE INTERESTS - Result for", userEmail, ":", result)
      return result
    }

    // Se usou todas as propostas gratuitas, verificar se tem plano ativo
    const { data: subscriptions, error: subError } = await supabase
      .from("user_subscriptions")
      .select("id, status, plan_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)

    const hasActiveSubscription = !subError && subscriptions && subscriptions.length > 0

    if (hasActiveSubscription) {
      // Buscar o plano do usuário
      const subscription = subscriptions[0]
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("slug")
        .eq("id", subscription.plan_id)
        .single()

      const planSlug = (plan?.slug ?? "free") as any
      const simultaneousLimit = PLAN_FEATURES[planSlug]?.limits?.simultaneous_interests ?? 8
      
      // Verificar limite de propostas simultâneas
      const activeCount = await getActiveInterestsCount(userEmail)
      
      if (activeCount >= simultaneousLimit) {
        const result = {
          canExpressInterest: false,
          reason: `Você atingiu o limite de ${simultaneousLimit} proposta(s) simultânea(s) do seu plano. Aguarde a conclusão de uma.`,
          isProfessional: true,
          freeInterestsUsed: 3,
          freeInterestsRemaining: 0,
          phoneVerified: true,
          hasActiveSubscription: true,
        }
        console.log("[v0-browser] SUBSCRIPTION LIMIT REACHED - Result for", userEmail, ":", result)
        return result
      }
      
      const result = {
        canExpressInterest: true,
        isProfessional: true,
        freeInterestsUsed: 3,
        freeInterestsRemaining: 0,
        phoneVerified: true,
        hasActiveSubscription: true,
      }
      console.log("[v0-browser] PROFESSIONAL WITH SUBSCRIPTION - Result for", userEmail, ":", result)
      return result
    }

    const result = {
      canExpressInterest: false,
      reason: "Você usou suas 3 propostas gratuitas. Para continuar, é necessário um plano de assinatura.",
      needsUpgrade: true,
      isProfessional: true,
      freeInterestsUsed: 3,
      freeInterestsRemaining: 0,
      phoneVerified: true,
      hasActiveSubscription: false,
    }
    console.log("[v0-browser] NEEDS UPGRADE - Result for", userEmail, ":", result)
    return result
  } catch (error) {
    return {
      canExpressInterest: false,
      reason: "Erro ao verificar sua permissão",
      phoneVerified: false,
    }
  }
}

export async function incrementInterestCount(userEmail: string): Promise<{
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

    const currentFreeRemaining = user.free_interests_remaining ?? 3
    const currentTotalSent = user.total_interests_sent ?? 0

    // DECREMENTAR contador de créditos gratuitos
    let newFreeRemaining = currentFreeRemaining
    if (user.is_professional && currentFreeRemaining > 0) {
      newFreeRemaining = currentFreeRemaining - 1  // DECREMENTAR
    }

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
