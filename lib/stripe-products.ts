export interface SubscriptionProduct {
  id: string
  slug: "simples" | "agencia"
  name: string
  description: string
  priceInCents: number // preço em centavos
  billingPeriod: "monthly" | "annual"
  /** Serviços que podem ocupar vaga ao mesmo tempo (aplicado em lib/interest-manager.ts). */
  simultaneousServices: number
  features: string[]
}

/** Regras reais do plano gratuito, aplicadas em lib/interest-manager.ts. */
export const FREE_PLAN_RULES = {
  totalProposals: 3,
  simultaneousServices: 1,
}

// Planos de subscrição - fonte de verdade para preços e vantagens exibidas.
// Só liste aqui vantagens que o sistema realmente aplica.
// IDs passados ao checkout devem ser os mesmos daqui
export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: "plan-simples-monthly",
    slug: "simples",
    name: "Plano Simples",
    description: "Para profissionais que atendem poucos clientes por vez",
    priceInCents: 2990, // R$29.90
    billingPeriod: "monthly",
    simultaneousServices: 2,
    features: [
      "Propostas ilimitadas, sem gastar créditos gratuitos",
      "Até 2 serviços simultâneos",
    ],
  },
  {
    id: "plan-agencia-monthly",
    slug: "agencia",
    name: "Plano Agência",
    description: "Para agências e profissionais com alto volume",
    priceInCents: 4990, // R$49.90
    billingPeriod: "monthly",
    simultaneousServices: 8,
    features: [
      "Propostas ilimitadas, sem gastar créditos gratuitos",
      "Até 8 serviços simultâneos",
    ],
  },
]

export function getProductById(id: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.id === id)
}

export function getProductBySlug(slug: string): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.slug === slug)
}
