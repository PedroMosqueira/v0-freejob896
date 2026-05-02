"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const MAX_FREE_INTERESTS = 3

export async function canUserExpressInterest(userEmail: string): Promise<{
  canExpressInterest: boolean
  reason?: string
  freeInterestsUsed?: number
  freeInterestsRemaining?: number
  isProfessional?: boolean
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
      .select("is_professional, free_interests_count, total_interests_count")
      .eq("email", userEmail)
      .single()

    if (userError || !user) {
      return {
        canExpressInterest: false,
        reason: "Usuário não encontrado",
      }
    }

    // Se não é profissional, pode expressar interesse
    if (!user.is_professional) {
      return {
        canExpressInterest: true,
        isProfessional: false,
      }
    }

    // Se é profissional, verifica se tem propostas gratuitas restantes
    const freeInterestsUsed = user.free_interests_count || 0
    const freeInterestsRemaining = MAX_FREE_INTERESTS - freeInterestsUsed

    if (freeInterestsRemaining > 0) {
      return {
        canExpressInterest: true,
        isProfessional: true,
        freeInterestsUsed,
        freeInterestsRemaining,
      }
    }

    return {
      canExpressInterest: false,
      reason: "Você usou suas 3 propostas gratuitas. Para continuar, é necessário um plano de assinatura.",
      isProfessional: true,
      freeInterestsUsed: MAX_FREE_INTERESTS,
      freeInterestsRemaining: 0,
    }
  } catch (error) {
    console.error("Erro ao verificar permissão de interesse:", error)
    return {
      canExpressInterest: false,
      reason: "Erro ao verificar sua permissão",
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
      .select("is_professional, free_interests_count, total_interests_count")
      .eq("email", userEmail)
      .single()

    if (userError || !user) {
      return {
        success: false,
        error: "Usuário não encontrado",
      }
    }

    const currentFreeCount = user.free_interests_count || 0
    const currentTotalCount = user.total_interests_count || 0

    // Incrementar contadores
    let newFreeCount = currentFreeCount
    if (user.is_professional && currentFreeCount < MAX_FREE_INTERESTS) {
      newFreeCount = currentFreeCount + 1
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        free_interests_count: newFreeCount,
        total_interests_count: currentTotalCount + 1,
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
      freeInterestsUsed: newFreeCount,
      freeInterestsRemaining: Math.max(0, MAX_FREE_INTERESTS - newFreeCount),
    }
  } catch (error) {
    console.error("Erro ao incrementar contador de interesses:", error)
    return {
      success: false,
      error: "Erro ao registrar seu interesse",
    }
  }
}
