export interface SubscriptionProduct {
  id: string
  slug: string
  name: string
  description: string
  priceInCents: number // preço em centavos
  billingPeriod: "monthly" | "annual"
  features: string[]
}

// Planos de subscrição - fonte de verdade para todos os preços
// IDs passados ao checkout devem ser os mesmos daqui
export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: "plan-simples-monthly",
    slug: "simples",
    name: "Plano Simples",
    description: "Para profissionais iniciantes",
    priceInCents: 2990, // R$29.90
    billingPeriod: "monthly",
    features: [
      "Sem limite de quantidade de propostas",
      "Limite de 2 propostas simultâneas",
      "Acesso a todas as demandas",
      "Cancelamento a qualquer momento",
    ],
  },
  {
    id: "plan-agencia-monthly",
    slug: "agencia",
    name: "Plano Agência",
    description: "Para agências e profissionais experientes",
    priceInCents: 4990, // R$49.90
    billingPeriod: "monthly",
    features: [
      "Sem limite de quantidade de propostas",
      "Limite de 8 propostas simultâneas",
      "Acesso prioritário a demandas",
      "Suporte dedicado",
    ],
  },
]

export function getProductById(id: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.id === id)
}

export function getProductBySlug(slug: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.slug === slug)
}
