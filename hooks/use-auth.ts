"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"

export function useAuth() {
  const [email, setEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFreeUser, setIsFreeUser] = useState(true)
  const [session, setSession] = useState<any>(null)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  )

  // Verificar sessão ao carregar o componente
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("[v0] Verificando sessão Supabase...")
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("[v0] Erro ao obter sessão:", error)
          setIsLoading(false)
          return
        }

        if (session?.user?.email) {
          console.log("[v0] ✅ Sessão encontrada:", session.user.email)
          setEmail(session.user.email)
          setSession(session)
          setIsFreeUser(true) // Todos são free users por padrão
        } else {
          console.log("[v0] ❌ Sem sessão")
          setEmail(null)
          setSession(null)
        }
      } catch (error) {
        console.error("[v0] Erro ao verificar sessão:", error)
        setEmail(null)
        setSession(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen para mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] Auth state change:", event, session?.user?.email)

      if (session?.user?.email) {
        setEmail(session.user.email)
        setSession(session)
        setIsFreeUser(true)
      } else {
        setEmail(null)
        setSession(null)
        setIsFreeUser(true)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      console.log("[v0] Fazendo logout...")
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("[v0] Erro ao fazer logout:", error)
        return false
      }

      console.log("[v0] ✅ Logout realizado")
      setEmail(null)
      setSession(null)
      return true
    } catch (error) {
      console.error("[v0] Erro ao fazer logout:", error)
      return false
    }
  }, [])

  const login = useCallback(async (userEmail: string, password?: string) => {
    console.log("[v0] Tentando fazer login com:", userEmail)
    // Placeholder - não usado para Supabase OAuth
    return true
  }, [])

  return { email, login, logout, isLoading, isFreeUser, session }
}
