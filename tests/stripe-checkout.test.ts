import { beforeEach, describe, expect, it, vi } from "vitest"
import type Stripe from "stripe"

async function loadStripeModule() {
  vi.resetModules()
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_unit")
  vi.stubEnv("Stripe_STRIPE_SECRET_KEY", "")
  vi.stubEnv("STRIPE_ACCESS_TOKEN", "")
  return import("@/lib/stripe")
}

describe("checkout de assinatura", () => {
  let mod: Awaited<ReturnType<typeof loadStripeModule>>
  let create: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    mod = await loadStripeModule()
    create = vi.fn().mockResolvedValue({ id: "cs_test_123" })
    vi.spyOn(mod.stripe.checkout.sessions, "create").mockImplementation(create as never)
  })

  it("cobra o preço do catálogo em BRL, mensal, quantidade 1", async () => {
    const { getProductBySlug } = await import("@/lib/stripe-products")
    const product = getProductBySlug("agencia")!

    await mod.createSubscriptionCheckoutSession(product.id, "a@b.com", "https://x/ok", "https://x/cancel")

    const params = create.mock.calls[0][0]
    expect(params.mode).toBe("subscription")
    expect(params.customer_email).toBe("a@b.com")
    expect(params.line_items).toHaveLength(1)
    expect(params.line_items[0].quantity).toBe(1)
    expect(params.line_items[0].price_data.currency).toBe("brl")
    expect(params.line_items[0].price_data.unit_amount).toBe(product.priceInCents)
    expect(params.line_items[0].price_data.recurring).toEqual({ interval: "month", interval_count: 1 })
  })

  it("não deixa metadata extra trocar o plano que está sendo pago", async () => {
    const { getProductBySlug } = await import("@/lib/stripe-products")
    const simples = getProductBySlug("simples")!

    await mod.createSubscriptionCheckoutSession(simples.id, "a@b.com", "https://x/ok", "https://x/cancel", {
      plan_slug: "agencia",
      product_id: "outro",
      origem: "teste",
    })

    const { metadata } = create.mock.calls[0][0]
    expect(metadata.plan_slug).toBe("simples")
    expect(metadata.product_id).toBe(simples.id)
    expect(metadata.origem).toBe("teste")
  })

  it("recusa produtos que não existem no catálogo", async () => {
    await expect(
      mod.createSubscriptionCheckoutSession("prod_falso", "a@b.com", "https://x/ok", "https://x/cancel"),
    ).rejects.toThrow(/não encontrado/)
    expect(create).not.toHaveBeenCalled()
  })

  it("converte reais para centavos sem erro de arredondamento", () => {
    expect(mod.toCents(29.9)).toBe(2990)
    expect(mod.toCents(0.1 + 0.2)).toBe(30)
    expect(mod.fromCents(4990)).toBe(49.9)
  })

  it("prefere a chave live quando existe uma", async () => {
    vi.resetModules()
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_a")
    vi.stubEnv("Stripe_STRIPE_SECRET_KEY", "sk_live_b")
    const { stripeMode } = await import("@/lib/stripe")
    expect(stripeMode).toBe("live")
  })
})

describe("sincronização da assinatura", () => {
  it("mapeia os status do Stripe para os status do app", async () => {
    vi.resetModules()
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const { mapSubscriptionStatus } = await import("@/lib/stripe-subscription-sync")
    const cases: Array<[Stripe.Subscription.Status, string]> = [
      ["active", "active"],
      ["trialing", "active"],
      ["canceled", "canceled"],
      ["incomplete_expired", "canceled"],
      ["past_due", "paused"],
      ["unpaid", "paused"],
      ["incomplete", "paused"],
    ]
    for (const [stripeStatus, expected] of cases) {
      expect(mapSubscriptionStatus(stripeStatus)).toBe(expected)
    }
  })

  it("lê o período do item da assinatura (API nova) e cai para o legado", async () => {
    const { getSubscriptionPeriod } = await import("@/lib/stripe-subscription-sync")
    const fromItem = getSubscriptionPeriod({
      items: { data: [{ current_period_start: 1_700_000_000, current_period_end: 1_702_592_000 }] },
    } as unknown as Stripe.Subscription)
    expect(fromItem).toEqual({
      start: new Date(1_700_000_000 * 1000).toISOString(),
      end: new Date(1_702_592_000 * 1000).toISOString(),
    })

    const legacy = getSubscriptionPeriod({
      items: { data: [] },
      current_period_start: 1_700_000_000,
      current_period_end: 1_702_592_000,
    } as unknown as Stripe.Subscription)
    expect(legacy.end).toBe(new Date(1_702_592_000 * 1000).toISOString())
  })

  it("normaliza o email do checkout", async () => {
    const { getCheckoutEmail } = await import("@/lib/stripe-subscription-sync")
    expect(getCheckoutEmail({ customer_email: "  Pedro@Exemplo.COM " } as Stripe.Checkout.Session)).toBe(
      "pedro@exemplo.com",
    )
    expect(
      getCheckoutEmail({ customer_email: null, customer_details: { email: "X@Y.com" } } as Stripe.Checkout.Session),
    ).toBe("x@y.com")
  })
})
