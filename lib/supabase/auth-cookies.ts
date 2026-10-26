import type { cookies } from "next/headers"

type CookieStore = Awaited<ReturnType<typeof cookies>>

// Matches the session cookie and its chunks (sb-<ref>-auth-token, .0, .1, ...) but not the PKCE code-verifier cookie.
const SESSION_COOKIE_PATTERN = /^sb-.+-auth-token(\.\d+)?$/

export function clearSupabaseSessionCookies(cookieStore: CookieStore) {
  for (const { name } of cookieStore.getAll()) {
    if (SESSION_COOKIE_PATTERN.test(name)) cookieStore.delete(name)
  }
}

export function isSupabaseSessionCookie(name: string) {
  return SESSION_COOKIE_PATTERN.test(name)
}
