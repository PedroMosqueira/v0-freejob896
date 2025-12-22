"use server"

if (typeof globalThis.btoa === "undefined") {
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

  globalThis.btoa = (str: string): string => {
    const utf8Bytes: number[] = []
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i)
      if (c < 0x80) {
        utf8Bytes.push(c)
      } else if (c < 0x800) {
        utf8Bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
      } else if (c < 0xd800 || c >= 0xe000) {
        utf8Bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
      } else {
        i++
        const s = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
        utf8Bytes.push(0xf0 | (s >> 18), 0x80 | ((s >> 12) & 0x3f), 0x80 | ((s >> 6) & 0x3f), 0x80 | (s & 0x3f))
      }
    }

    let r = ""
    for (let i = 0; i < utf8Bytes.length; i += 3) {
      const b1 = utf8Bytes[i],
        b2 = utf8Bytes[i + 1] || 0,
        b3 = utf8Bytes[i + 2] || 0
      r += base64Chars[b1 >> 2]
      r += base64Chars[((b1 & 0x3) << 4) | (b2 >> 4)]
      r += i + 1 < utf8Bytes.length ? base64Chars[((b2 & 0xf) << 2) | (b3 >> 6)] : "="
      r += i + 2 < utf8Bytes.length ? base64Chars[b3 & 0x3f] : "="
    }
    return r
  }
}

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = {
    from: (data: string, encoding?: string) => {
      if (encoding === "base64") {
        // Decode base64
        const binaryString = atob(data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return {
          toString: (enc: string) => {
            if (enc === "utf8" || enc === "utf-8") {
              return new TextDecoder().decode(bytes)
            }
            return data
          },
        }
      }
      // Default: treat as UTF-8 string
      return {
        toString: (enc: string) => {
          if (enc === "base64") {
            return btoa(data)
          }
          return data
        },
      }
    },
  } as any
}

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}

export async function createSupabaseServerClient() {
  return createClient()
}
