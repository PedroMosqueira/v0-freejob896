import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não está definido nas variáveis de ambiente")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
})

// Calcular valores do pagamento
export function calculatePaymentAmounts(bidAmount: number) {
  const platformFee = bidAmount * 0.15 // 15% de taxa
  const professionalBonus = bidAmount * 0.05 // 5% de bônus
  const totalAmount = bidAmount + platformFee // Cliente paga lance + 15%
  const professionalReceives = bidAmount + professionalBonus // Profissional recebe lance + 5%
  const platformNet = platformFee - professionalBonus // Lucro líquido da plataforma = 10%

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
