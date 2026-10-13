"use client"

import useSWR from "swr"
import { useAuth } from "@/hooks/use-auth"
import { PLAN_FEATURES } from "@/lib/subscription-manager"
import { ACTIVE_INTERESTS_KEY, fetchActiveInterests } from "@/lib/active-interests-client"

export function InterestsCounter() {
  const { email, subscriptionPlan } = useAuth()
  const isPaidPlan = subscriptionPlan === "simples" || subscriptionPlan === "agencia"

  const { data } = useSWR(email && isPaidPlan ? ACTIVE_INTERESTS_KEY : null, fetchActiveInterests, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  if (!isPaidPlan || data === undefined) {
    return null
  }

  const plan = PLAN_FEATURES[subscriptionPlan]
  const limit = plan.limits.simultaneous_interests
  const planName = plan.name
  const activeInterests = data.count

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

