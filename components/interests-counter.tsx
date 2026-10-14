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
  const heldCount = Math.min(data.heldCount, activeInterests)
  const workingCount = activeInterests - heldCount

  const percentageUsed = (activeInterests / limit) * 100
  const isNearLimit = percentageUsed >= 75

  // Working slots first, then slots held by the 2h post-cancellation rule.
  const slots = Array.from({ length: limit }, (_, i) =>
    i < workingCount ? "active" : i < activeInterests ? "held" : "free",
  )

  const releaseTime = data.nextReleaseAt
    ? new Date(data.nextReleaseAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null
  const tooltip = [
    `Serviços simultâneos: ${activeInterests}/${limit} - ${planName}`,
    heldCount > 0 && releaseTime
      ? `${heldCount} vaga(s) retida(s) por cancelamento. Próxima libera às ${releaseTime}.`
      : null,
  ]
    .filter(Boolean)
    .join("\n")

  return (
    <div
      title={tooltip}
      aria-label={tooltip}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-help group"
    >
      {/* Barra seccionada */}
      <div className="flex gap-1">
        {slots.map((slot, index) => (
          <div
            key={index}
            className={`h-3 w-2 rounded-sm transition-colors ${
              slot === "active"
                ? isNearLimit
                  ? "bg-orange-500"
                  : "bg-blue-500"
                : slot === "held"
                  ? "border border-dashed border-orange-500 bg-orange-500/20"
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

