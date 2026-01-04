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
      // Converte string UTF-8 para UTF-16, depois para base64
      try {
        return originalBtoa(unescape(encodeURIComponent(str)))
      } catch (e2) {
        console.error("[v0] Erro ao codificar base64:", e2)
        throw e2
      }
    }
  }
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
