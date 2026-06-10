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
    console.log("[v0] === canUserExpressInterest START ===")
    console.log("[v0] Input email:", userEmail)
    const supabase = await createSupabaseServerClient()

    // Buscar dados do usuário
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, is_professional, free_interests_remaining, total_interests_sent, phone_verified")
      .eq("email", userEmail)
      .limit(1)

    if (userError) {
      console.error("[v0] Query error:", { userError, message: userError?.message, code: userError?.code })
      throw userError
    }

    if (!users || users.length === 0) {
      console.error("[v0] User not found for email:", userEmail)
      return {
        canExpressInterest: false,
        reason: "Usuário não encontrado",
        phoneVerified: false,
      }
    }

    const user = users[0]
    console.log("[v0] User found - FULL DATA:", { 
      email: userEmail, 
      userId: user.id, 
      phoneVerified: user.phone_verified, 
      isProfessional: user.is_professional,
      freeInterestsRemaining: user.free_interests_remaining
    })

    // Verificar se tem telefone validado
    if (!user.phone_verified) {
      console.log("[v0] Phone not verified, blocking:", { email: userEmail, phone_verified: user.phone_verified })
      return {
        canExpressInterest: false,
        reason: "Você precisa validar seu telefone primeiro",
        needsPhoneValidation: true,
        isProfessional: user.is_professional || false,
        phoneVerified: false,
      }
    }

    console.log("[v0] Phone verified, continuing...")

    // Se não é profissional, pode expressar interesse
    if (!user.is_professional) {
      return {
        canExpressInterest: true,
        isProfessional: false,
        phoneVerified: true,
      }
    }

    // Se é profissional, verifica se tem propostas gratuitas restantes
    const freeInterestsRemaining = user.free_interests_remaining ?? 3

    if (freeInterestsRemaining > 0) {
      // Verificar também limite de propostas simultâneas
      const activeCount = await getActiveInterestsCount(userEmail)
      const planLimit = PLAN_FEATURES.free?.limits?.simultaneous_interests ?? 1
      
      console.log("[v0] Active interests check:", { activeCount, planLimit, freeRemaining: freeInterestsRemaining })
      
      if (activeCount >= planLimit) {
        return {
          canExpressInterest: false,
          reason: `Você atingiu o limite de ${planLimit} proposta(s) simultânea(s). Aguarde a conclusão de uma para continuar.`,
          isProfessional: true,
          phoneVerified: true,
          freeInterestsRemaining,
          hasActiveSubscription: false,
        }
      }
      
      return {
        canExpressInterest: true,
        isProfessional: true,
        freeInterestsUsed: 3 - freeInterestsRemaining,
        freeInterestsRemaining,
        phoneVerified: true,
        hasActiveSubscription: false,
      }
    }

    // Se usou todas as propostas gratuitas, verificar se tem plano ativo
    console.log("[v0] Checking subscription for user:", user.id)
    const { data: subscriptions, error: subError } = await supabase
      .from("user_subscriptions")
      .select("id, status, plan_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)

    console.log("[v0] Subscription result:", { subscriptions, subError })

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
      
      console.log("[v0] Subscribed user - simultaneous check:", { activeCount, planSlug, limit: simultaneousLimit })
      
      if (activeCount >= simultaneousLimit) {
        return {
          canExpressInterest: false,
          reason: `Você atingiu o limite de ${simultaneousLimit} proposta(s) simultânea(s) do seu plano. Aguarde a conclusão de uma.`,
          isProfessional: true,
          freeInterestsUsed: 3,
          freeInterestsRemaining: 0,
          phoneVerified: true,
          hasActiveSubscription: true,
        }
      }
      
      return {
        canExpressInterest: true,
        isProfessional: true,
        freeInterestsUsed: 3,
        freeInterestsRemaining: 0,
        phoneVerified: true,
        hasActiveSubscription: true,
      }
    }

    return {
      canExpressInterest: false,
      reason: "Você usou suas 3 propostas gratuitas. Para continuar, é necessário um plano de assinatura.",
      needsUpgrade: true,
      isProfessional: true,
      freeInterestsUsed: 3,
      freeInterestsRemaining: 0,
      phoneVerified: true,
      hasActiveSubscription: false,
    }
  } catch (error) {
    console.error("[v0] === CATCH BLOCK HIT ===")
    console.error("[v0] ERROR in canUserExpressInterest:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as any)?.code,
      email: userEmail,
    })
    console.error("[v0] Full error object:", error)
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
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    // Buscar dados do usuário
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("is_professional, free_interests_remaining, total_interests_sent")
      .eq("email", userEmail)
      .single()

    if (userError || !user) {
      return {
        success: false,
        error: "Usuário não encontrado",
      }
    }

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
