if (typeof window !== "undefined" && typeof window.btoa === "function") {
  const originalBtoa = window.btoa.bind(window)
  window.btoa = (str: string): string => {
    try {
      return originalBtoa(str)
    } catch {
      // Converte UTF-8 para Latin1 usando unescape/encodeURIComponent
      return originalBtoa(unescape(encodeURIComponent(str)))
    }
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
