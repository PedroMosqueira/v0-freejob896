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

  // Fetch subscription data for user - without dependencies to prevent re-creation
  const fetchSubscription = useCallback(async (userId: string) => {
    try {
      console.log("[v0] Fetching subscription for user:", userId)
      
      // Use limit(1) instead of single() - faster query
      const { data: subscriptionsData, error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .select("id, user_id, plan_id, status, stripe_subscription_id, current_period_end")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)

      if (subscriptionError) {
        console.log("[v0] Subscription query error:", subscriptionError)
        if (isMountedRef.current) {
          setSubscriptionPlan("free")
          setSubscription(null)
        }
        return
      }

      // No active subscription found
      if (!subscriptionsData || subscriptionsData.length === 0) {
        console.log("[v0] No active subscription found")
        if (isMountedRef.current) {
          setSubscriptionPlan("free")
          setSubscription(null)
        }
        return
      }

      const subscriptionData = subscriptionsData[0]

      if (subscriptionData && subscriptionData.plan_id) {
        console.log("[v0] Fetching plan for id:", subscriptionData.plan_id)
        
        const { data: planData, error: planError } = await supabase
          .from("subscription_plans")
          .select("slug")
          .eq("id", subscriptionData.plan_id)
          .limit(1)

        if (!planError && planData && planData.length > 0 && isMountedRef.current) {
          console.log("[v0] ✅ Plan found:", planData[0].slug)
          setSubscriptionPlan(planData[0].slug as SubscriptionPlan)
          setSubscription(subscriptionData)
          return
        }
      }
      
      if (isMountedRef.current) {
        console.log("[v0] No plan data found")
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
  }, [])

  // Check session only on mount - NO dependencies to run once
  useEffect(() => {
    isMountedRef.current = true
    let timeoutId: NodeJS.Timeout

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!isMountedRef.current) return

        if (error || !session?.user?.email) {
          console.log("[v0] No session found")
          if (isMountedRef.current) setIsLoading(false)
          return
        }

        console.log("[v0] Session found:", session.user.email)
        setEmail(session.user.email)
        setSession(session)
        
        // Set loading to false immediately - subscription will load in background
        if (isMountedRef.current) {
          console.log("[v0] Setting isLoading to false (session verified)")
          setIsLoading(false)
        }

        // Fetch subscription in background without blocking
        console.log("[v0] Starting subscription fetch in background...")
        fetchSubscription(session.user.id).catch(err => {
          console.error("[v0] Background subscription fetch error:", err)
        })
      } catch (error) {
        console.error("[v0] Session check error:", error)
        if (isMountedRef.current) {
          console.log("[v0] Setting isLoading to false (error)")
          setIsLoading(false)
        }
      }
    }

    checkSession()

    // Set a max timeout of 3 seconds - if we're still loading after 3s, force it to false
    timeoutId = setTimeout(() => {
      if (isMountedRef.current && isLoading) {
        console.log("[v0] AUTH TIMEOUT: Setting isLoading to false after 3 seconds")
        setIsLoading(false)
      }
    }, 3000)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return

        console.log("[v0] Auth change:", event, session?.user?.email)
        
        if (session?.user?.email) {
          setEmail(session.user.email)
          setSession(session)
          // Set loading to false immediately
          if (isMountedRef.current) {
            setIsLoading(false)
          }
          // Fetch subscription in background
          console.log("[v0] onAuthStateChange: Fetching subscription in background...")
          fetchSubscription(session.user.id).catch(err => {
            console.error("[v0] Auth change subscription fetch error:", err)
          })
        } else {
          setEmail(null)
          setSession(null)
          setSubscriptionPlan("free")
          setSubscription(null)
        }
      }
    )

    return () => {
      console.log("[v0] useAuth cleanup")
      isMountedRef.current = false
      clearTimeout(timeoutId)
      if (subscription) subscription.unsubscribe()
    }
  }, [])

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
  }, [])

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
