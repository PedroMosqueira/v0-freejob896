import { createBrowserClient } from "@supabase/ssr"

if (typeof window !== "undefined" && typeof window.btoa !== "undefined") {
  const originalBtoa = window.btoa
  window.btoa = (str: string): string => {
    try {
      // Tenta usar btoa nativo primeiro para strings ASCII simples
      if (!/[^\x00-\x7F]/.test(str)) {
        return originalBtoa(str)
      }

      // Para strings com caracteres UTF-8, usa TextEncoder
      const encoder = new TextEncoder()
      const bytes = encoder.encode(str)
      let binary = ""
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
      })
      return originalBtoa(binary)
    } catch (e) {
      // Fallback manual se tudo falhar
      const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
      const encoder = new TextEncoder()
      const utf8Bytes = encoder.encode(str)
      let result = ""

      for (let i = 0; i < utf8Bytes.length; i += 3) {
        const byte1 = utf8Bytes[i]
        const byte2 = i + 1 < utf8Bytes.length ? utf8Bytes[i + 1] : 0
        const byte3 = i + 2 < utf8Bytes.length ? utf8Bytes[i + 2] : 0

        result += base64Chars[byte1 >> 2]
        result += base64Chars[((byte1 & 0x3) << 4) | (byte2 >> 4)]
        result += i + 1 < utf8Bytes.length ? base64Chars[((byte2 & 0xf) << 2) | (byte3 >> 6)] : "="
        result += i + 2 < utf8Bytes.length ? base64Chars[byte3 & 0x3f] : "="
      }

      return result
    }
  }
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
