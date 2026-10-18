import { beforeEach, describe, expect, it, vi } from "vitest"

const rpc = vi.fn()

vi.mock("next/headers", () => ({ headers: vi.fn() }))
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc }) }))

async function loadRateLimit() {
  vi.resetModules()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
  return import("@/lib/rate-limit")
}

describe("limite de tentativas", () => {
  beforeEach(() => {
    rpc.mockReset()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("libera quando todas as regras estão dentro do limite", async () => {
    rpc.mockResolvedValue({ data: [{ allowed: true, reset_at: new Date().toISOString() }], error: null })
    const { checkRateLimit } = await loadRateLimit()

    const result = await checkRateLimit([
      { key: "login:ip:1.1.1.1", limit: 10, windowSeconds: 600 },
      { key: "login:email:A@B.com", limit: 5, windowSeconds: 600 },
    ])

    expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 })
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[1][1].p_key).toBe("login:email:a@b.com")
  })

  it("bloqueia e informa o maior tempo de espera entre as regras estouradas", async () => {
    const now = Date.now()
    rpc
      .mockResolvedValueOnce({ data: [{ allowed: false, reset_at: new Date(now + 120_000).toISOString() }], error: null })
      .mockResolvedValueOnce({ data: [{ allowed: false, reset_at: new Date(now + 600_000).toISOString() }], error: null })
    const { checkRateLimit } = await loadRateLimit()

    const result = await checkRateLimit([
      { key: "a", limit: 1, windowSeconds: 60 },
      { key: "b", limit: 1, windowSeconds: 600 },
    ])

    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(590)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(600)
  })

  it("não trava o login se o banco falhar", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "timeout" } })
    const { checkRateLimit } = await loadRateLimit()

    const result = await checkRateLimit([{ key: "x", limit: 1, windowSeconds: 60 }])
    expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 })
  })

  it("não trava o login sem credenciais do banco", async () => {
    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("SUPABASE_URL", "")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")
    const { checkRateLimit } = await import("@/lib/rate-limit")

    expect(await checkRateLimit([{ key: "x", limit: 1, windowSeconds: 60 }])).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it("responde 429 com Retry-After e mensagem em português", async () => {
    const { tooManyRequests, formatRetryAfter } = await loadRateLimit()

    expect(formatRetryAfter(30)).toBe("alguns segundos")
    expect(formatRetryAfter(60)).toBe("1 minuto")
    expect(formatRetryAfter(600)).toBe("10 minutos")
    expect(formatRetryAfter(7200)).toBe("2 horas")

    const response = tooManyRequests(600)
    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBe("600")
    expect((await response.json()).error).toBe("Muitas tentativas. Tente novamente em 10 minutos.")
  })
})
