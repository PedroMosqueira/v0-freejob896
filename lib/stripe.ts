import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não está definido nas variáveis de ambiente")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
})

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
