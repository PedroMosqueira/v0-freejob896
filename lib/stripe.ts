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

// Criar sessão de checkout para subscrição
export async function createSubscriptionCheckoutSession(
  productId: string,
  userEmail: string,
  successUrl: string,
  cancelUrl: string,
) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe não está configurado")
  }

  const { getProductById } = await import("./stripe-products")
  const product = getProductById(productId)

  if (!product) {
    throw new Error(`Produto "${productId}" não encontrado`)
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.priceInCents,
          recurring: {
            interval: "month",
            interval_count: 1,
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    customer_email: userEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      product_id: productId,
      plan_slug: product.slug,
    },
  })

  return session
}

