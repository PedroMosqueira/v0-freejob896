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
  const isMountedRef = useRef(true)

  // Fetch subscription data for user
  const fetchSubscription = useCallback(async (userId: string) => {
    try {
      console.log("[v0] Fetching subscription for user:", userId)
      
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .select("id, user_id, plan_id, status, stripe_subscription_id, current_period_end")
        .eq("user_id", userId)
        .eq("status", "active")
        .single()

      if (subscriptionError) {
        console.log("[v0] No active subscription")
        if (isMountedRef.current) {
          setSubscriptionPlan("free")
          setSubscription(null)
        }
        return
      }

      if (subscriptionData && subscriptionData.plan_id) {
        console.log("[v0] Fetching plan for id:", subscriptionData.plan_id)
        
        const { data: planData, error: planError } = await supabase
          .from("subscription_plans")
          .select("slug")
          .eq("id", subscriptionData.plan_id)
          .single()

        if (!planError && planData && isMountedRef.current) {
          console.log("[v0] ✅ Plan:", planData.slug)
          setSubscriptionPlan(planData.slug as SubscriptionPlan)
          setSubscription(subscriptionData)
          return
        }
      }
      
      if (isMountedRef.current) {
        setSubscriptionPlan("free")
        setSubscription(null)
      }
    } catch (error) {
      console.error("[v0] Error fetching subscription:", error)
      if (isMountedRef.current) {
        setSubscriptionPlan("free")
        setSubscription(null)
      }
    }
  }, [supabase])

  // Check session only on mount
  useEffect(() => {
    isMountedRef.current = true
    let timeoutId: NodeJS.Timeout | null = null

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!isMountedRef.current) return

        if (error || !session?.user?.email) {
          console.log("[v0] No session found")
          if (isMountedRef.current) {
            setIsLoading(false)
          }
          return
        }

        console.log("[v0] Session found:", session.user.email)
        setEmail(session.user.email)
        setSession(session)
        
        // Fetch subscription after session is set
        await fetchSubscription(session.user.id)
        
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      } catch (error) {
        console.error("[v0] Session check error:", error)
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    // Set timeout to force loading to false after 5 seconds
    timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        console.log("[v0] Auth check timeout - forcing loading to false")
        setIsLoading(false)
      }
    }, 5000)

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return

        console.log("[v0] Auth change:", event)
        
        if (session?.user?.email) {
          setEmail(session.user.email)
          setSession(session)
          await fetchSubscription(session.user.id)
        } else {
          setEmail(null)
          setSession(null)
          setSubscriptionPlan("free")
          setSubscription(null)
        }
      }
    )

    return () => {
      isMountedRef.current = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription?.unsubscribe()
    }
  }, [supabase, fetchSubscription])

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setEmail(null)
      setSession(null)
      setSubscriptionPlan("free")
      setSubscription(null)
      return true
    } catch (error) {
      console.error("[v0] Logout error:", error)
      return false
    }
  }, [supabase])

  return { 
    email, 
    logout, 
    isLoading, 
    subscriptionPlan,
    subscription,
    isSubscribed: subscriptionPlan !== "free",
    session 
  }
}
