import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }))

import { FREE_PLAN_RULES, getProductById, getProductBySlug, SUBSCRIPTION_PRODUCTS } from "@/lib/stripe-products"
import { isPaidSubscriptionStatus, isSubscriptionExpired } from "@/lib/subscription-status"
import { canPerformAction, PLAN_FEATURES, type UserSubscription } from "@/lib/subscription-manager"

function subscription(plan: UserSubscription["plan"]): UserSubscription {
  return { plan } as UserSubscription
}

describe("catálogo de planos", () => {
  it("cobra os valores anunciados em centavos", () => {
    expect(getProductBySlug("simples")?.priceInCents).toBe(2990)
    expect(getProductBySlug("agencia")?.priceInCents).toBe(4990)
  })

  it("encontra cada plano pelo id e pelo slug", () => {
    for (const product of SUBSCRIPTION_PRODUCTS) {
      expect(getProductById(product.id)).toBe(product)
      expect(getProductBySlug(product.slug)).toBe(product)
    }
  })

  it("não reconhece planos inexistentes", () => {
    expect(getProductBySlug("premium-gratis")).toBeUndefined()
    expect(getProductById("prod_falso")).toBeUndefined()
  })

  it("dá mais serviços simultâneos conforme o plano sobe", () => {
    const simples = getProductBySlug("simples")!.simultaneousServices
    const agencia = getProductBySlug("agencia")!.simultaneousServices
    expect(FREE_PLAN_RULES.simultaneousServices).toBeLessThan(simples)
    expect(simples).toBeLessThan(agencia)
  })

  it("mostra na tela o mesmo preço que é cobrado", () => {
    expect(PLAN_FEATURES.simples.price).toBe(29.9)
    expect(PLAN_FEATURES.agencia.price).toBe(49.9)
  })
})

describe("status da assinatura", () => {
  it.each(["active", "trialing", "plan", " ACTIVE "])("libera o plano pago para %j", (status) => {
    expect(isPaidSubscriptionStatus(status)).toBe(true)
  })

  it.each(["free", "canceled", "paused", "past_due", "", null, undefined])("não libera para %j", (status) => {
    expect(isPaidSubscriptionStatus(status)).toBe(false)
  })

  it("considera expirada só depois do fim do período", () => {
    const now = new Date("2026-10-18T12:00:00Z")
    expect(isSubscriptionExpired("2026-10-18T11:59:59Z", now)).toBe(true)
    expect(isSubscriptionExpired("2026-10-18T12:00:01Z", now)).toBe(false)
    expect(isSubscriptionExpired(null, now)).toBe(false)
  })
})

describe("limites de uso", () => {
  it("plano gratuito para no limite mensal de interesses", () => {
    const limit = PLAN_FEATURES.free.limits.interests_per_month
    expect(canPerformAction(subscription("free"), "interest", limit - 1)).toBe(true)
    expect(canPerformAction(subscription("free"), "interest", limit)).toBe(false)
  })

  it("planos pagos não têm limite de interesses", () => {
    expect(canPerformAction(subscription("simples"), "interest", 9999)).toBe(true)
    expect(canPerformAction(subscription("agencia"), "interest", 9999)).toBe(true)
  })

  it("lances são ilimitados em todos os planos", () => {
    for (const plan of ["free", "simples", "agencia"] as const) {
      expect(canPerformAction(subscription(plan), "bid", 9999)).toBe(true)
    }
  })

  it("só a Agência remove anúncios e impulsiona o perfil", () => {
    expect(PLAN_FEATURES.free.limits.has_ads).toBe(true)
    expect(PLAN_FEATURES.simples.limits.has_ads).toBe(true)
    expect(PLAN_FEATURES.agencia.limits.has_ads).toBe(false)
    expect(PLAN_FEATURES.agencia.limits.profile_boost).toBe(true)
  })
})
