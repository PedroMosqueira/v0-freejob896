import { createBrowserClient } from "@supabase/ssr"

if (typeof window !== "undefined") {
  const originalBtoa = window.btoa
  window.btoa = (str: string) => {
    try {
      return originalBtoa(str)
    } catch (e) {
      // Converte UTF-8 para Latin1 antes de encodar
      return originalBtoa(unescape(encodeURIComponent(str)))
    }
  }
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        const cookies = document.cookie.split(";")
        const cookie = cookies.find((c) => c.trim().startsWith(`${name}=`))
        return cookie ? decodeURIComponent(cookie.split("=")[1]) : null
      },
      set(name: string, value: string, options: any) {
        let cookie = `${name}=${encodeURIComponent(value)}`
        if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
        if (options?.path) cookie += `; path=${options.path}`
        if (options?.domain) cookie += `; domain=${options.domain}`
        if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
        if (options?.secure) cookie += "; secure"
        document.cookie = cookie
      },
      remove(name: string, options: any) {
        document.cookie = `${name}=; max-age=0; path=${options?.path || "/"}`
      },
    },
  })
}

export function createClient() {
  return createSupabaseBrowserClient()
}
