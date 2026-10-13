import Stripe from "stripe"

// The v0 Stripe integration injects a sandbox (test) key as Stripe_STRIPE_SECRET_KEY.
// Prefer a live key from any of the configured variables so checkout charges for real;
// fall back to the first key found only when no live key exists.
const candidateKeys = [
  process.env.STRIPE_SECRET_KEY,
  process.env.Stripe_STRIPE_SECRET_KEY,
  process.env.STRIPE_ACCESS_TOKEN,
]
  .map((key) => key?.trim())
  .filter((key): key is string => Boolean(key))

const isLiveKey = (key: string) => key.startsWith("sk_live_") || key.startsWith("rk_live_")

const configuredKey = candidateKeys.find(isLiveKey) ?? candidateKeys[0]

export const stripeMode: "live" | "test" | "missing" = !configuredKey
  ? "missing"
  : isLiveKey(configuredKey)
    ? "live"
    : "test"

if (stripeMode !== "live") {
  console.warn(`[stripe] Running in ${stripeMode} mode - payments will not be charged for real.`)
}

// Dummy value only so the build does not fail when no key is set.
export const stripe = new Stripe(configuredKey || "sk_test_dummy_for_build", {
  apiVersion: "2025-12-15.clover",
  typescript: true,
})

// Função para validar se o Stripe está configurado corretamente
export function isStripeConfigured(): boolean {
  return Boolean(configuredKey)
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
  metadata?: Record<string, string>,
) {
  console.log("[v0] createSubscriptionCheckoutSession called with:", { productId, userEmail, successUrl, cancelUrl, metadata })
  
  if (!isStripeConfigured()) {
    console.error("[v0] Stripe is not configured. STRIPE_SECRET_KEY is missing.")
    throw new Error("Stripe não está configurado")
  }

  console.log("[v0] Stripe is configured, fetching product...")
  const { getProductById } = await import("./stripe-products")
  const product = getProductById(productId)

  console.log("[v0] Product found:", product)
  if (!product) {
    throw new Error(`Produto "${productId}" não encontrado`)
  }

  console.log("[v0] Creating Stripe checkout session with product:", product)
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
      ...metadata, // Adicionar metadata customizada
    },
  })

  console.log("[v0] Stripe checkout session created successfully:", session.id)
  return session
}

