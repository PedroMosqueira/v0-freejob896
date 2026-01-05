import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Aplicar polyfill do btoa ANTES de criar o cliente Supabase
if (typeof window !== "undefined" && window.btoa) {
  const originalBtoa = window.btoa
  window.btoa = (str: string) => {
    try {
      return originalBtoa(str)
    } catch (e) {
      // Se falhar com UTF-8, converte primeiro
      return originalBtoa(unescape(encodeURIComponent(str)))
    }
  }
}

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
