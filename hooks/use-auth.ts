"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export type SubscriptionPlan = "free" | "simples" | "agencia"

interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  status: "active" | "canceled" | "past_due" | "trialing"
  stripe_subscription_id: string
  current_period_end: string
}

export function useAuth() {
  const [email, setEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>("free")
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [session, setSession] = useState<any>(null)

  const supabaseRef = useRef(createSupabaseBrowserClient())
  const supabase = supabaseRef.current

  // Fetch subscription data for user
  const fetchSubscription = useCallback(async (userId: string, userEmail: string) => {
    try {
      console.log("[v0] Fetching subscription for user:", userEmail)
      
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .select("id, user_id, plan_id, status, stripe_subscription_id, current_period_end")
        .eq("user_id", userId)
        .eq("status", "active")
        .single()

      if (subscriptionError) {
        console.log("[v0] No active subscription found:", subscriptionError.message)
        setSubscriptionPlan("free")
        setSubscription(null)
        return
      }

      if (subscriptionData) {
        console.log("[v0] ✅ Active subscription found:", subscriptionData.plan_id)
        
        // Get plan slug from plan_id
        const { data: planData, error: planError } = await supabase
          .from("subscription_plans")
          .select("slug")
          .eq("id", subscriptionData.plan_id)
          .single()

        if (planError || !planData) {
          console.error("[v0] Error fetching plan details:", planError)
          setSubscriptionPlan("free")
          setSubscription(null)
          return
        }

        console.log("[v0] Plan slug:", planData.slug)
        setSubscriptionPlan(planData.slug as SubscriptionPlan)
        setSubscription(subscriptionData)
      }
    } catch (error) {
      console.error("[v0] Error fetching subscription:", error)
      setSubscriptionPlan("free")
      setSubscription(null)
    }
  }, [supabase])

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
          
          // Fetch subscription data
          await fetchSubscription(session.user.id, session.user.email)
        } else {
          console.log("[v0] ❌ Sem sessão")
          setEmail(null)
          setSession(null)
          setSubscriptionPlan("free")
          setSubscription(null)
        }
      } catch (error) {
        console.error("[v0] Erro ao verificar sessão:", error)
        setEmail(null)
        setSession(null)
        setSubscriptionPlan("free")
        setSubscription(null)
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
        await fetchSubscription(session.user.id, session.user.email)
      } else {
        setEmail(null)
        setSession(null)
        setSubscriptionPlan("free")
        setSubscription(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase, fetchSubscription])

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
      setSubscriptionPlan("free")
      setSubscription(null)
      return true
    } catch (error) {
      console.error("[v0] Erro ao fazer logout:", error)
      return false
    }
  }, [supabase])

  const login = useCallback(async (userEmail: string, password?: string) => {
    console.log("[v0] Tentando fazer login com:", userEmail)
    return true
  }, [])

  return { 
    email, 
    login, 
    logout, 
    isLoading, 
    subscriptionPlan,
    subscription,
    isSubscribed: subscriptionPlan !== "free",
    session 
  }
}
