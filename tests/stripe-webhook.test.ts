import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import Stripe from "stripe"

const activateSubscriptionFromCheckout = vi.fn()

vi.mock("@/lib/stripe-subscription-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe-subscription-sync")>()),
  activateSubscriptionFromCheckout: (...args: unknown[]) => activateSubscriptionFromCheckout(...args),
}))
vi.mock("@/lib/push-notifications-server", () => ({ buildNotificationUrl: vi.fn(), safeSendPush: vi.fn() }))
vi.mock("@/lib/email-notifications", () => ({ sendNotificationEmail: vi.fn() }))

const SECRET = "whsec_unit_test"
const signer = new Stripe("sk_test_signer")

function webhookRequest(payload: object, signature?: string) {
  const body = JSON.stringify(payload)
  const headers = new Headers({ "content-type": "application/json" })
  const sig = signature ?? signer.webhooks.generateTestHeaderString({ payload: body, secret: SECRET })
  if (sig) headers.set("stripe-signature", sig)
  return new NextRequest("http://localhost/api/webhooks/stripe", { method: "POST", body, headers })
}

function event(type: string, object: object) {
  return { id: "evt_test", object: "event", type, data: { object } }
}

describe("webhook do Stripe", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET)
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    activateSubscriptionFromCheckout.mockReset()
  })

  async function handle(request: NextRequest) {
    const { handleStripeWebhook } = await import("@/lib/stripe-webhook-handler")
    return handleStripeWebhook(request)
  }

  it("rejeita chamadas sem assinatura", async () => {
    const res = await handle(webhookRequest(event("checkout.session.completed", {}), ""))
    expect(res.status).toBe(400)
    expect(activateSubscriptionFromCheckout).not.toHaveBeenCalled()
  })

  it("rejeita assinatura falsificada", async () => {
    const res = await handle(webhookRequest(event("checkout.session.completed", {}), "t=1,v1=assinatura-falsa"))
    expect(res.status).toBe(400)
    expect(activateSubscriptionFromCheckout).not.toHaveBeenCalled()
  })

  it("rejeita assinatura feita com outro segredo", async () => {
    const payload = event("checkout.session.completed", {})
    const forged = signer.webhooks.generateTestHeaderString({ payload: JSON.stringify(payload), secret: "whsec_outro" })
    const res = await handle(webhookRequest(payload, forged))
    expect(res.status).toBe(400)
  })

  it("ativa o plano quando o checkout é concluído", async () => {
    const session = { id: "cs_test_1", mode: "subscription", metadata: { plan_slug: "simples" } }
    const res = await handle(webhookRequest(event("checkout.session.completed", session)))
    expect(res.status).toBe(200)
    expect(activateSubscriptionFromCheckout).toHaveBeenCalledWith(expect.objectContaining({ id: "cs_test_1" }))
  })

  it("responde 500 quando a ativação falha, para o Stripe tentar de novo", async () => {
    activateSubscriptionFromCheckout.mockRejectedValueOnce(new Error("banco fora"))
    const res = await handle(webhookRequest(event("checkout.session.completed", { id: "cs_test_2" })))
    expect(res.status).toBe(500)
  })

  it("ignora eventos que não usamos sem dar erro", async () => {
    const res = await handle(webhookRequest(event("invoice.created", { id: "in_1" })))
    expect(res.status).toBe(200)
    expect(activateSubscriptionFromCheckout).not.toHaveBeenCalled()
  })
})
