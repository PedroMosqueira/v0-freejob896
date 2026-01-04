if (typeof window !== "undefined" && typeof window.btoa !== "undefined") {
  const originalBtoa = window.btoa

  window.btoa = (str: string): string => {
    // Tenta ASCII puro primeiro (mais rápido)
    if (/^[\x00-\x7F]*$/.test(str)) {
      try {
        return originalBtoa(str)
      } catch {
        // Fallthrough para UTF-8
      }
    }

    // Converte UTF-8 para Latin1 antes de encodar
    try {
      // Método 1: Usando TextEncoder (moderno)
      if (typeof TextEncoder !== "undefined") {
        const encoder = new TextEncoder()
        const uint8Array = encoder.encode(str)
        let latin1 = ""
        for (let i = 0; i < uint8Array.length; i++) {
          latin1 += String.fromCharCode(uint8Array[i])
        }
        return originalBtoa(latin1)
      }

      // Método 2: Usando unescape/encodeURIComponent (fallback)
      return originalBtoa(unescape(encodeURIComponent(str)))
    } catch (error) {
      console.error("[v0] btoa encoding failed:", error, "input:", str)
      throw error
    }
  }

  console.log("[v0] btoa polyfill installed successfully")
}

import { createBrowserClient } from "@supabase/ssr"

export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
