import { PlansContent } from "@/components/plans-content"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuth } from "@/lib/auth"

export const metadata = {
  title: "Planos | Freejob",
  description: "Escolha o plano que melhor se adapta às suas necessidades",
}

export default async function PlansPage() {
  const supabase = await createSupabaseServerClient()
  const auth = await getAuth()

  let plans = []
  let currentPlan = undefined

  try {
    // Buscar planos ativos
    const { data: plansData, error: plansError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("price_monthly", { ascending: true })

    if (!plansError && plansData) {
      plans = plansData
    }

    // Se usuário autenticado, obter plano atual
    if (auth?.user?.email) {
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .select("subscription_plans(slug)")
        .eq("user_id", auth.user.id)
        .eq("status", "active")
        .maybeSingle()

      if (!subscriptionError && subscriptionData) {
        currentPlan = subscriptionData.subscription_plans?.slug
      }
    }
  } catch (error) {
    console.error("[v0] Erro ao carregar planos:", error)
  }

  return <PlansContent plans={plans} currentPlan={currentPlan} />
}
