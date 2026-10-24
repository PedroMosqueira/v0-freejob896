import { Car } from "lucide-react"
import { FEATURES } from "@/lib/feature-flags"
import { formatCurrency } from "@/lib/pricing"
import { estimateTravelCost } from "@/lib/travel-estimate"

export function TravelEstimateBadge({ distanceKm }: { distanceKm?: number | null }) {
  if (!FEATURES.travelEstimate) return null
  const estimate = estimateTravelCost(distanceKm)
  if (!estimate) return null

  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border/60 bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-lg backdrop-blur-sm"
      title={`Corrida ida e volta, cerca de ${estimate.roadKm} km e ${estimate.minutes} min por trecho. Valor estimado.`}
    >
      <Car className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">Deslocamento estimado:</span>
      {formatCurrency(estimate.min)}–{formatCurrency(estimate.max)}
    </span>
  )
}
