if (typeof window !== "undefined" && typeof window.btoa !== "undefined") {
  const originalBtoa = window.btoa

  window.btoa = (str: string): string => {
    try {
      return originalBtoa(str)
    } catch (e) {
      // Fallback para UTF-8: converte string para bytes e depois para base64
      const utf8Bytes = new TextEncoder().encode(str)
      let binary = ""
      utf8Bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
      })
      return originalBtoa(binary)
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
