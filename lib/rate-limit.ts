import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

type RateLimitRule = {
  key: string
  limit: number
  windowSeconds: number
}

let adminClient: SupabaseClient | null = null

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  adminClient ??= createClient(url, serviceKey, { auth: { persistSession: false } })
  return adminClient
}

function ipFromHeaders(source: Headers) {
  const forwarded = source.get("x-forwarded-for")
  return forwarded?.split(",")[0]?.trim() || source.get("x-real-ip") || "unknown"
}

export function getClientIp(request: Request) {
  return ipFromHeaders(request.headers)
}

export async function getActionClientIp() {
  return ipFromHeaders(await headers())
}

// Fails open: a database hiccup must never lock legitimate users out of login or signup.
export async function checkRateLimit(rules: RateLimitRule[]) {
  const client = getAdminClient()
  if (!client) return { allowed: true, retryAfterSeconds: 0 }

  let retryAfterSeconds = 0
  for (const rule of rules) {
    const { data, error } = await client.rpc("rate_limit_hit", {
      p_key: rule.key.toLowerCase(),
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    })
    if (error) {
      console.error("[rate-limit] check failed:", error.message)
      continue
    }
    const result = Array.isArray(data) ? data[0] : data
    if (result && !result.allowed) {
      const seconds = Math.ceil((new Date(result.reset_at).getTime() - Date.now()) / 1000)
      retryAfterSeconds = Math.max(retryAfterSeconds, seconds, 1)
    }
  }

  return { allowed: retryAfterSeconds === 0, retryAfterSeconds }
}

export function formatRetryAfter(seconds: number) {
  if (seconds < 60) return "alguns segundos"
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`
  const hours = Math.ceil(minutes / 60)
  return `${hours} ${hours === 1 ? "hora" : "horas"}`
}

export function tooManyRequests(retryAfterSeconds: number, extra: Record<string, unknown> = {}) {
  const message = `Muitas tentativas. Tente novamente em ${formatRetryAfter(retryAfterSeconds)}.`
  return NextResponse.json(
    { success: false, error: message, message, ...extra },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  )
}
