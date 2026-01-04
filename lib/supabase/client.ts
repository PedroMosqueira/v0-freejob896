if (typeof window !== "undefined") {
  const originalBtoa = window.btoa

  window.btoa = (str: string): string => {
    try {
      // Tenta usar btoa nativo para strings ASCII (mais rápido)
      return originalBtoa(str)
    } catch (e) {
      // Fallback para UTF-8 usando encodeURIComponent e unescape
      // Método mais compatível que funciona em todos os navegadores
      try {
        return originalBtoa(unescape(encodeURIComponent(str)))
      } catch (fallbackError) {
        console.error("[v0] btoa encoding error:", fallbackError)
        // Último recurso: retorna string vazia para não quebrar a aplicação
        return ""
      }
    }
  }
}

import { createBrowserClient } from "@supabase/ssr"

export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
