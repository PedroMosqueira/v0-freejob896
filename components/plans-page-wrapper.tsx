"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PlansContent } from "./plans-content"
import { useAuth } from "@/hooks/use-auth"
import type { SubscriptionPlan } from "@/lib/subscription-manager"

interface Plan {
  id: string
  name: string
  slug: string
  description: string
  price_monthly: number
  price_annual: number
  features: string[]
  is_active: boolean
}

export function PlansPageWrapper() {
  const router = useRouter()
  const { email, subscriptionPlan } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubscribing, setIsSubscribing] = useState(false)

  // Fetch plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/plans")
        if (response.ok) {
          const data = await response.json()
          setPlans(data.plans || [])
        }
      } catch (error) {
        console.error("[v0] Error fetching plans:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlans()
  }, [])

  const handleSelectPlan = async (plan: Plan, billingCycle: "monthly" | "annual") => {
    if (!email) {
      console.error("[v0] User not authenticated")
      router.push("/auth/login")
      return
    }

    setIsSubscribing(true)

    try {
      console.log("[v0] Subscribing to plan:", plan.slug, billingCycle)

      // Call subscribe API
      const response = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          planSlug: plan.slug,
          billingCycle,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Erro ao se inscrever: ${error.error || "Tente novamente"}`)
        return
      }

      const result = await response.json()
      console.log("[v0] Subscription created:", result)

      // Redirect based on payment method
      if (result.checkoutUrl) {
        // Stripe checkout
        window.location.href = result.checkoutUrl
      } else if (result.success) {
        // Direct subscription (for testing/free plans)
        alert("Parabéns! Você se inscreveu com sucesso!")
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error) {
      console.error("[v0] Error subscribing:", error)
      alert("Erro ao processar sua inscrição. Tente novamente.")
    } finally {
      setIsSubscribing(false)
    }
  }

  return (
    <PlansContent
      plans={plans}
      currentPlan={subscriptionPlan}
      onSelectPlan={handleSelectPlan}
      isLoading={isLoading || isSubscribing}
    />
  )
}
