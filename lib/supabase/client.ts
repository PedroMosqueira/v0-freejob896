const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="

function utf8Btoa(str: string): string {
  const utf8Str = unescape(encodeURIComponent(String(str)))
  let output = ""

  for (let i = 0; i < utf8Str.length; i += 3) {
    const chr1 = utf8Str.charCodeAt(i)
    const chr2 = utf8Str.charCodeAt(i + 1)
    const chr3 = utf8Str.charCodeAt(i + 2)

    const enc1 = chr1 >> 2
    const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4)
    let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6)
    let enc4 = chr3 & 63

    if (isNaN(chr2)) {
      enc3 = enc4 = 64
    } else if (isNaN(chr3)) {
      enc4 = 64
    }

    output += base64Chars.charAt(enc1) + base64Chars.charAt(enc2) + base64Chars.charAt(enc3) + base64Chars.charAt(enc4)
  }

  return output
}

// Aplica polyfill imediatamente se estiver no browser
if (typeof window !== "undefined" && typeof window.btoa !== "undefined") {
  const originalBtoa = window.btoa.bind(window)
  window.btoa = (str: string): string => {
    try {
      return originalBtoa(str)
    } catch {
      return utf8Btoa(str)
    }
  }
}

// Também aplica no globalThis para garantir
if (typeof globalThis !== "undefined") {
  const g = globalThis as any
  if (typeof g.btoa === "function") {
    const originalBtoa = g.btoa.bind(g)
    g.btoa = (str: string): string => {
      try {
        return originalBtoa(str)
      } catch {
        return utf8Btoa(str)
      }
    }
  } else {
    g.btoa = utf8Btoa
  }
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  supabaseInstance = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    },
  )

  return supabaseInstance
}

export function createSupabaseBrowserClient() {
  return createClient()
}
