import { describe, expect, it } from "vitest"
import { BID_RESPONSE_LOCK_MS, getWithdrawPolicy, INTEREST_WITHDRAW_WAIT_MS } from "@/lib/withdraw-policy"
import { formatRetryAfter, getClientIp } from "@/lib/rate-limit"

const sentAt = "2026-10-18T12:00:00.000Z"
const t0 = Date.parse(sentAt)

describe("regra de desistência do profissional", () => {
  it("bloqueia por 2h após o interesse, mesmo que o cliente já tenha aberto o chat", () => {
    const locked = getWithdrawPolicy({ interestSentAt: sentAt, latestBid: null, now: t0 + 60 * 60 * 1000 })
    expect(locked).toMatchObject({ allowed: false, reason: "interest_wait" })

    const open = getWithdrawPolicy({ interestSentAt: sentAt, latestBid: null, now: t0 + INTEREST_WITHDRAW_WAIT_MS })
    expect(open).toEqual({ allowed: true, reason: "interest_timeout" })
  })

  it("trava 30 min após um lance pendente", () => {
    const bid = { sentAt, status: "pending" }
    expect(getWithdrawPolicy({ interestSentAt: sentAt, latestBid: bid, now: t0 + 60_000 })).toMatchObject({
      allowed: false,
      reason: "bid_pending",
    })
    expect(getWithdrawPolicy({ interestSentAt: sentAt, latestBid: bid, now: t0 + BID_RESPONSE_LOCK_MS })).toEqual({
      allowed: true,
      reason: "bid_timeout",
    })
  })

  it("libera quando o cliente recusa o lance", () => {
    const policy = getWithdrawPolicy({
      interestSentAt: sentAt,
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
