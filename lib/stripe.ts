import Stripe from "stripe"

// Usar valor dummy durante build se a chave não estiver definida
// Em produção, a chave DEVE estar definida nas variáveis de ambiente
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_dummy_for_build"

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
})

// Função para validar se o Stripe está configurado corretamente
export function isStripeConfigured(): boolean {
  return process.env.STRIPE_SECRET_KEY !== undefined && process.env.STRIPE_SECRET_KEY !== ""
}

// Calcular valores do pagamento (0% de taxa - Gratuito no primeiro ano!)
export function calculatePaymentAmounts(bidAmount: number) {
  // Plataforma gratuita no primeiro ano - sem taxas!
  const platformFee = 0
  const professionalBonus = 0
  const totalAmount = bidAmount // Cliente paga apenas o lance
  const professionalReceives = bidAmount // Profissional recebe o lance inteiro
  const platformNet = 0 // Sem lucro no primeiro ano

  return {
    bidAmount,
    platformFee,
    professionalBonus,
    totalAmount,
    professionalReceives,
    platformNet,
  }
}

// Formatar valor para centavos (Stripe usa centavos)
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

// Formatar centavos para reais
export function fromCents(cents: number): number {
  return cents / 100
}
