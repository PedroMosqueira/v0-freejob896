import { describe, expect, it } from "vitest"
import { BID_RESPONSE_LOCK_MS, getWithdrawPolicy, UNVIEWED_INTEREST_WAIT_MS } from "@/lib/withdraw-policy"
import { formatRetryAfter, getClientIp } from "@/lib/rate-limit"

const sentAt = "2026-10-18T12:00:00.000Z"
const t0 = Date.parse(sentAt)

describe("regra de desistência do profissional", () => {
  it("bloqueia antes do cliente ver o interesse e libera depois de 2h", () => {
    const locked = getWithdrawPolicy({ interestSentAt: sentAt, requesterViewedAt: null, latestBid: null, now: t0 + 1000 })
    expect(locked).toMatchObject({ allowed: false, reason: "awaiting_view" })

    const open = getWithdrawPolicy({
      interestSentAt: sentAt,
      requesterViewedAt: null,
      latestBid: null,
      now: t0 + UNVIEWED_INTEREST_WAIT_MS,
    })
    expect(open).toEqual({ allowed: true, reason: "unviewed_timeout" })
  })

  it("libera assim que o cliente visualiza", () => {
    const policy = getWithdrawPolicy({ interestSentAt: sentAt, requesterViewedAt: sentAt, latestBid: null, now: t0 })
    expect(policy).toEqual({ allowed: true, reason: "viewed" })
  })

  it("trava 30 min após um lance pendente, mesmo se o cliente já viu", () => {
    const bid = { sentAt, status: "pending" }
    expect(
      getWithdrawPolicy({ interestSentAt: sentAt, requesterViewedAt: sentAt, latestBid: bid, now: t0 + 60_000 }),
    ).toMatchObject({ allowed: false, reason: "bid_pending" })
    expect(
      getWithdrawPolicy({ interestSentAt: sentAt, requesterViewedAt: sentAt, latestBid: bid, now: t0 + BID_RESPONSE_LOCK_MS }),
    ).toEqual({ allowed: true, reason: "bid_timeout" })
  })

  it("libera quando o cliente recusa o lance", () => {
    const policy = getWithdrawPolicy({
      interestSentAt: sentAt,
      requesterViewedAt: null,
      latestBid: { sentAt, status: "declined_by_requester" },
      now: t0,
    })
    expect(policy).toEqual({ allowed: true, reason: "bid_declined" })
  })
})

describe("limite de tentativas", () => {
  it("escreve o tempo de espera em português", () => {
    expect(formatRetryAfter(30)).toBe("alguns segundos")
    expect(formatRetryAfter(60)).toBe("1 minuto")
    expect(formatRetryAfter(15 * 60)).toBe("15 minutos")
    expect(formatRetryAfter(3600)).toBe("1 hora")
    expect(formatRetryAfter(5 * 3600)).toBe("5 horas")
  })

  it("usa o primeiro IP do x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "200.1.2.3, 10.0.0.1" } })
    expect(getClientIp(req)).toBe("200.1.2.3")
    expect(getClientIp(new Request("http://x"))).toBe("unknown")
  })
})
