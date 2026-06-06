"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
    const interval = setInterval(fetchActiveInterests, 30000) // Atualiza a cada 30s
    return () => clearInterval(interval)
  }, [email])

  if (loading) {
    return (
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border border-blue-200 dark:border-blue-800">
        <div className="text-sm text-gray-600 dark:text-gray-400">Carregando...</div>
      </Card>
    )
  }

  const plan = (subscriptionPlan || "free") as SubscriptionPlan
  const planFeatures = PLAN_FEATURES[plan]
  const limit = planFeatures.limits.simultaneous_interests
  const percentageUsed = limit > 0 ? (activeInterests / limit) * 100 : 0
  const isNearLimit = percentageUsed >= 75

  return (
    <Card className={`p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border ${
      isNearLimit ? "border-orange-300 dark:border-orange-700" : "border-blue-200 dark:border-blue-800"
    }`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            Propostas Ativas
          </h3>
          <span className={`text-lg font-bold ${
            isNearLimit ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"
          }`}>
            {activeInterests} / {limit === -1 ? "∞" : limit}
          </span>
        </div>
        
        {limit > 0 && (
          <>
            <Progress 
              value={Math.min(percentageUsed, 100)} 
              className={isNearLimit ? "bg-orange-100" : "bg-blue-100"}
            />
            {isNearLimit && (
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                ⚠️ Você está chegando ao limite de propostas simultâneas
              </p>
            )}
          </>
        )}

        <div className="text-xs text-gray-600 dark:text-gray-400">
          Plano: <span className="font-semibold">{planFeatures.name}</span>
        </div>
      </div>
    </Card>
  )
}
