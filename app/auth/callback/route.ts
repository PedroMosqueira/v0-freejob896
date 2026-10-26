import { createServerClient } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { ensureUserProfile } from "@/lib/ensure-user-profile"
import { clearSupabaseSessionCookies, isSupabaseSessionCookie } from "@/lib/supabase/auth-cookies"

export const dynamic = "force-dynamic"

const EMAIL_OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "email_change"]
const PENDING_REF_PATTERN = /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{20,100}$/

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const otpType = requestUrl.searchParams.get("type") as EmailOtpType | null
  const error = requestUrl.searchParams.get("error")
  const errorCode = requestUrl.searchParams.get("error_code")
  const pending = requestUrl.searchParams.get("pending")
  const validPending = pending && PENDING_REF_PATTERN.test(pending) ? pending : null
  const cookieStore = await cookies()

  // Errors keep the pending request reference so a retry still publishes it.
  const redirectHome = (authError?: string) => {
    const url = new URL("/", requestUrl.origin)
    if (authError) url.searchParams.set("auth_error", authError)
    if (validPending) url.searchParams.set("pending", validPending)
    return NextResponse.redirect(url)
  }

  if (error) {
    console.error("[v0] Auth error param:", error, errorCode)
    return redirectHome(errorCode === "otp_expired" ? "link_expired" : "auth_failed")
  }

  // token_hash links (custom email template) verify without a PKCE verifier,
  // so they work even when opened in a different browser or device.
  if (tokenHash && otpType && EMAIL_OTP_TYPES.includes(otpType)) {
    const supabase = createCallbackClient(cookieStore)
    if (!supabase) return redirectHome("auth_failed")

    const { data, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
    if (verifyError || !data.user) {
      console.error("[v0] verifyOtp error:", verifyError?.code, verifyError?.message)
      return redirectHome("link_expired")
    }

    const profile = await ensureUserProfile(data.user)
    if (!profile.ok) {
      console.error("[v0] Erro ao criar perfil:", profile.error)
      return redirectHome("profile_failed")
    }
    return redirectHome()
  }

  // Processar code de Magic Link ou OAuth
  if (code) {
    const supabase = createCallbackClient(cookieStore)
    if (!supabase) return redirectHome("auth_failed")

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error("[v0] Exchange error:", exchangeError.code, exchangeError.message)
        // A missing verifier means the link was opened in another browser than the one that requested it.
        const missingVerifier =
          /code verifier|flow state|both auth code and code verifier/i.test(exchangeError.message) ||
          exchangeError.code === "flow_state_not_found" ||
          exchangeError.code === "bad_code_verifier"
        return redirectHome(missingVerifier ? "other_browser" : "auth_failed")
      }

      if (data.user) {
        const profile = await ensureUserProfile(data.user)
        if (!profile.ok) {
          console.error("[v0] Erro ao criar perfil:", profile.error)
          return redirectHome("profile_failed")
        }
      }

      return redirectHome()
    } catch (err) {
      console.error("[v0] Callback error:", err instanceof Error ? err.message : err)
      return redirectHome("auth_failed")
    }
  }

  return redirectHome()
}

function createCallbackClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error("[v0] Supabase credentials missing")
    return null
  }

  // A leftover session (e.g. from a deleted account) makes the client refresh it in the background while
  // verifyOtp runs; when that refresh fails it wipes the cookies, including the brand-new session.
  // The callback always establishes a fresh session, so the old one is discarded up front.
  clearSupabaseSessionCookies(cookieStore)

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().filter(({ name, value }) => !isSupabaseSessionCookie(name) || value)
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Cookies are read-only during render; route handlers can set them.
        }
      },
    },
  })
}
