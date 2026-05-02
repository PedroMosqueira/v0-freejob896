"use client"

import type React from "react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // O Supabase gerencia a sessão internamente via listeners
  // Não precisamos de SessionProvider do NextAuth
  return <>{children}</>
}
