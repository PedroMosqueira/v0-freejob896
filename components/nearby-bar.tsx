"use client"

import { Check, ChevronDown, Globe, MapPin, MapPinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NearbyAlertToggle } from "./nearby-alert-toggle"

export const RADIUS_OPTIONS_KM = [10, 25, 50, 100] as const
export type RadiusKm = (typeof RADIUS_OPTIONS_KM)[number]
export type LocationState = "locating" | "granted" | "denied" | "unavailable"

interface NearbyBarProps {
  locationState: LocationState
  radiusKm: RadiusKm
  remoteOnly: boolean
  city?: string
  location?: { latitude: number; longitude: number } | null
  onRadiusChange: (radius: RadiusKm) => void
  onRemoteOnlyChange: (remoteOnly: boolean) => void
  onRequestLocation: () => void
}

function DistancePicker({
  radiusKm,
  remoteOnly,
  onRadiusChange,
  onRemoteOnlyChange,
  allowRadius,
}: {
  radiusKm: RadiusKm
  remoteOnly: boolean
  onRadiusChange: (radius: RadiusKm) => void
  onRemoteOnlyChange: (remoteOnly: boolean) => void
  allowRadius: boolean
}) {
  const label = remoteOnly ? "Remoto" : allowRadius ? `${radiusKm} km` : "Todas as regiões"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" aria-label={`Distância: ${label}`}>
          {remoteOnly ? (
            <Globe className="h-4 w-4" aria-hidden="true" />
          ) : (
            <MapPin className="h-4 w-4" aria-hidden="true" />
          )}
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Distância máxima</DropdownMenuLabel>
        {allowRadius ? (
          RADIUS_OPTIONS_KM.map((option) => {
            const active = !remoteOnly && option === radiusKm
            return (
              <DropdownMenuItem
                key={option}
                onSelect={() => {
                  onRemoteOnlyChange(false)
                  onRadiusChange(option)
                }}
                className="justify-between"
              >
                {`Até ${option} km`}
                {active && <Check className="h-4 w-4" aria-hidden="true" />}
              </DropdownMenuItem>
            )
          })
        ) : (
          <DropdownMenuItem onSelect={() => onRemoteOnlyChange(false)} className="justify-between">
            Todas as regiões
            {!remoteOnly && <Check className="h-4 w-4" aria-hidden="true" />}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onRemoteOnlyChange(true)} className="justify-between">
          <span className="flex items-center gap-2">
            <Globe className="h-4 w-4" aria-hidden="true" />
            Só remotos
          </span>
          {remoteOnly && <Check className="h-4 w-4" aria-hidden="true" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function NearbyBar({
  locationState,
  radiusKm,
  remoteOnly,
  city,
  location,
  onRadiusChange,
  onRemoteOnlyChange,
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
      <div className="flex flex-col gap-3">
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
        <div className="flex justify-end">
          <DistancePicker
            radiusKm={radiusKm}
            remoteOnly={remoteOnly}
            onRadiusChange={onRadiusChange}
            onRemoteOnlyChange={onRemoteOnlyChange}
            allowRadius={false}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {remoteOnly ? (
          <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        ) : (
          <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        )}
        {remoteOnly
          ? "Serviços remotos de qualquer lugar"
          : `Serviços em até ${radiusKm} km de você${city ? ` (${city})` : ""}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <DistancePicker
          radiusKm={radiusKm}
          remoteOnly={remoteOnly}
          onRadiusChange={onRadiusChange}
          onRemoteOnlyChange={onRemoteOnlyChange}
          allowRadius
        />
        {location && <NearbyAlertToggle location={location} />}
      </div>
    </div>
  )
}
