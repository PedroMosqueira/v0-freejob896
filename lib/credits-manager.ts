import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Configurações de créditos
 */
export const CREDITS_CONFIG = {
  FREE_INTERESTS_INITIAL: 3,
  FREE_INTERESTS_REFILL: 0, // Sem recarga automática
}

/**
 * Obter créditos disponíveis de um usuário
 */
export async function getUserCredits(email: string): Promise<number> {
  try {
    const supabase = createSupabaseBrowserClient()

    const { data, error } = await supabase
      .from("users")
      .select("free_interests_remaining")
      .eq("email", email)
      .single()

    if (error) {
      console.error("[v0] Erro ao obter créditos:", error)
      return 0
    }

    return data?.free_interests_remaining || 0
  } catch (error) {
    console.error("[v0] Erro ao obter créditos:", error)
    return 0
  }
}

/**
 * Decrementar crédito do usuário (usar interesse gratuito)
 */
export async function deductCredit(email: string): Promise<boolean> {
  try {
    const supabase = createSupabaseBrowserClient()

    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("free_interests_remaining")
      .eq("email", email)
      .single()

    if (fetchError) {
      console.error("[v0] Erro ao buscar créditos atuais:", fetchError)
      return false
    }

    const currentCredits = currentUser?.free_interests_remaining || 0

    if (currentCredits <= 0) {
      return false
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ free_interests_remaining: currentCredits - 1 })
      .eq("email", email)

    if (updateError) {
      console.error("[v0] Erro ao decrementar crédito:", updateError)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Erro ao descontar crédito:", error)
    return false
  }
}

/**
 * Verificar se usuário tem créditos disponíveis
 */
export async function hasAvailableCredits(email: string): Promise<boolean> {
  try {
    const credits = await getUserCredits(email)
    return credits > 0
  } catch (error) {
    console.error("[v0] Erro ao verificar créditos disponíveis:", error)
    return false
  }
}

/**
 * Obter informações detalhadas de créditos do usuário
 */
export async function getCreditsInfo(
  email: string,
): Promise<{
  freeCreditsRemaining: number
  hasActiveSubscription: boolean
  subscriptionPlan?: string
}> {
  try {
    const supabase = createSupabaseBrowserClient()

    // Obter créditos gratuitos
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("free_interests_remaining")
      .eq("email", email)
      .single()

    if (userError) {
      console.error("[v0] Erro ao obter dados do usuário:", userError)
      return {
        freeCreditsRemaining: 0,
        hasActiveSubscription: false,
      }
    }

    // Verificar assinatura ativa
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select("subscription_plans(name), status")
      .eq("user_id", userData?.id)
      .eq("status", "active")
      .maybeSingle()

    if (subscriptionError) {
      console.error("[v0] Erro ao obter assinatura:", subscriptionError)
      return {
        freeCreditsRemaining: userData?.free_interests_remaining || 0,
        hasActiveSubscription: false,
      }
    }

    return {
      freeCreditsRemaining: userData?.free_interests_remaining || 0,
      hasActiveSubscription: !!subscriptionData,
      subscriptionPlan: subscriptionData?.subscription_plans?.name,
    }
  } catch (error) {
    console.error("[v0] Erro ao obter informações de créditos:", error)
    return {
      freeCreditsRemaining: 0,
      hasActiveSubscription: false,
    }
  }
}
