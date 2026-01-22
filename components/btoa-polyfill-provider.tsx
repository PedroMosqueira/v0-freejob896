"use client"

import type React from "react"

import { useEffect } from "react"
import { installBtoaUtf8Polyfill } from "@/lib/btoa-utf8-polyfill"

export function BtoaPolyfillProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Instalar polyfill assim que o componente montar
    installBtoaUtf8Polyfill()
  }, [])

  return <>{children}</>
}
