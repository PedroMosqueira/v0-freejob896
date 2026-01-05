import { createBrowserClient } from "@supabase/ssr"

if (typeof window !== "undefined") {
  const originalBtoa = window.btoa
  window.btoa = (str: string): string => {
    try {
      return originalBtoa(str)
    } catch (error) {
      // Se falhar, converte UTF-8 para Latin1 antes de encodar
      console.log("[v0] btoa polyfill: converting UTF-8 string")
      return originalBtoa(unescape(encodeURIComponent(str)))
    }
  }
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
