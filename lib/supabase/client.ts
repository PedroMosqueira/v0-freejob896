import { createBrowserClient } from "@supabase/ssr"

if (typeof window !== "undefined") {
  const originalBtoa = window.btoa

  // Sobrescrever btoa para suportar UTF-8
  window.btoa = (str: string): string => {
    try {
      // Tenta usar btoa nativo primeiro (funciona para ASCII)
      return originalBtoa(str)
    } catch (e) {
      // Se falhar (caracteres UTF-8), converte para base64 manualmente
      try {
        return originalBtoa(unescape(encodeURIComponent(str)))
      } catch (e2) {
        console.error("[v0] Erro ao codificar base64:", e2)
        throw e2
      }
    }
  }
}

// Singleton - criar apenas uma instância do cliente
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseBrowserClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    console.log("[v0] ✅ Supabase client criado (singleton)")
  }
  return supabaseInstance
}

// Alias para compatibilidade
export function createClient() {
  return createSupabaseBrowserClient()
}
