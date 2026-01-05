"use client"

import { useEffect } from "react"

export function BtoaPolyfillInit() {
  useEffect(() => {
    console.log("[v0] 🔧 Inicializando polyfill btoa...")

    // Limpar cookies Supabase corrompidos
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim()
      if (name.startsWith("sb-") || name.includes("supabase")) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`
        console.log("[v0] Cookie Supabase removido:", name)
      }
    })

    // Aplicar polyfill btoa para UTF-8
    const nativeBtoa = window.btoa
    window.btoa = (str: string) => {
      try {
        return nativeBtoa(str)
      } catch (e) {
        console.log("[v0] btoa: convertendo UTF-8 para Latin1")
        return nativeBtoa(unescape(encodeURIComponent(str)))
      }
    }

    console.log("[v0] ✅ Polyfill btoa aplicado")
  }, [])

  return null
}
