"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { PLAN_FEATURES } from "@/lib/subscription-manager"
import type { SubscriptionPlan } from "@/lib/subscription-manager"

export function InterestsCounter() {
  const { email, subscriptionPlan } = useAuth()
  const [activeInterests, setActiveInterests] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!email) return

    const fetchActiveInterests = async () => {
      try {
        const response = await fetch(`/api/interests/active?email=${encodeURIComponent(email)}`)
        if (response.ok) {
          const data = await response.json()
          setActiveInterests(data.count || 0)
        }
      } catch (error) {
        console.error("[v0] Error fetching active interests:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchActiveInterests()
    const interval = setInterval(fetchActiveInterests, 30000)
    return () => clearInterval(interval)
  }, [email])

  // Get plan features based on subscription
  let limit = -1 // unlimited by default
  let planName = "Grátis"

  if (subscriptionPlan === "simples") {
    limit = 2
    planName = "Plano Simples"
  } else if (subscriptionPlan === "agencia") {
    limit = 8
    planName = "Plano Agência"
  }

  if (loading || limit === -1) {
    return null // Não mostrar para planos ilimitados ou enquanto carrega
  }

  const percentageUsed = (activeInterests / limit) * 100
  const isNearLimit = percentageUsed >= 75

  // Criar array de slots para visualizar seccionado
  const slots = Array.from({ length: limit }, (_, i) => i < activeInterests)

  return (
    <div
      title={`Propostas Ativas: ${activeInterests}/${limit} - ${planName}`}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-help group"
    >
      {/* Barra seccionada */}
      <div className="flex gap-1">
        {slots.map((isActive, index) => (
          <div
            key={index}
            className={`h-3 w-2 rounded-sm transition-colors ${
              isActive
                ? isNearLimit
                  ? "bg-orange-500"
                  : "bg-blue-500"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          />
        ))}
      </div>

      {/* Texto contador */}
      <span
        className={`text-xs font-semibold whitespace-nowrap ${
          isNearLimit ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"
        }`}
      >
        {activeInterests}/{limit}
      </span>
    </div>
  )
}

