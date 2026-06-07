import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[v0] Missing Supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function insertPlans() {
  console.log("[v0] Inserting subscription plans...")

  const plans = [
    {
      name: "Plano Simples",
      slug: "simples",
      description: "Perfeito para profissionais iniciantes",
      price_monthly: 29.9,
      price_annual: 299.0,
      stripe_price_id_monthly: "price_1QxxxxxSimples_monthly",
      stripe_price_id_annual: "price_1QxxxxxSimples_annual",
      features: [
        "Até 5 propostas simultâneas",
        "Chat com clientes",
        "Dashboard básico",
        "Suporte por email",
      ],
      is_active: true,
    },
    {
      name: "Plano Agência",
      slug: "agencia",
      description: "Para agências e profissionais com alto volume",
      price_monthly: 49.9,
      price_annual: 499.0,
      stripe_price_id_monthly: "price_1QxxxxxAgencia_monthly",
      stripe_price_id_annual: "price_1QxxxxxAgencia_annual",
      features: [
        "Propostas ilimitadas",
        "Chat ilimitado",
        "Dashboard avançado",
        "Analytics detalhado",
        "Prioridade no suporte",
        "API de integração",
      ],
      is_active: true,
    },
  ]

  try {
    // Check if plans already exist
    const { data: existingPlans } = await supabase
      .from("subscription_plans")
      .select("id")
      .in(
        "slug",
        plans.map((p) => p.slug),
      )

    if (existingPlans && existingPlans.length > 0) {
      console.log("[v0] Plans already exist. Skipping insertion.")
      return
    }

    // Insert plans
    const { data, error } = await supabase
      .from("subscription_plans")
      .insert(plans)
      .select()

    if (error) {
      console.error("[v0] Error inserting plans:", error)
      process.exit(1)
    }

    console.log("[v0] Successfully inserted plans:", data)
  } catch (error) {
    console.error("[v0] Error in insertPlans:", error)
    process.exit(1)
  }
}

insertPlans()
