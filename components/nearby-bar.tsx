"use client"

import { MapPin, MapPinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NearbyAlertToggle } from "./nearby-alert-toggle"

export const RADIUS_OPTIONS_KM = [10, 25, 50, 100] as const
export type RadiusKm = (typeof RADIUS_OPTIONS_KM)[number]
export type LocationState = "locating" | "granted" | "denied" | "unavailable"

interface NearbyBarProps {
  locationState: LocationState
  radiusKm: RadiusKm
  city?: string
  location?: { latitude: number; longitude: number } | null
  onRadiusChange: (radius: RadiusKm) => void
  onRequestLocation: () => void
}

export function NearbyBar({
  locationState,
  radiusKm,
  city,
  location,
  onRadiusChange,
  onRequestLocation,
}: NearbyBarProps) {
  if (locationState === "locating") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <MapPin className="h-4 w-4 animate-pulse" aria-hidden="true" />
        Buscando sua localização...
      </p>
    )
  }

  if (locationState !== "granted") {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <MapPinOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">Ative sua localização</p>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {locationState === "denied"
                ? "A localização está bloqueada. Libere o acesso nas configurações do navegador para ver só serviços perto de você. Por enquanto, a lista mostra serviços de todas as regiões."
                : "Não conseguimos identificar onde você está. Por enquanto, a lista mostra serviços de todas as regiões."}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onRequestLocation} className="shrink-0">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          Usar minha localização
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        {`Serviços em até ${radiusKm} km de você${city ? ` (${city})` : ""}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Distância máxima" className="flex items-center gap-1">
        {RADIUS_OPTIONS_KM.map((option) => {
          const active = option === radiusKm
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onRadiusChange(option)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {`${option} km`}
            </button>
          )
        })}
      </div>
      {location && <NearbyAlertToggle location={location} radiusKm={radiusKm} />}
      </div>
    </div>
  )
}
