"use client"

import useSWR from "swr"
import { MapPin, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { PublicNeedPreview } from "@/app/api/public/needs/route"

const CATEGORY_IMAGES: Record<string, string> = {
  eletricista: "/electrician-working.png",
  encanador: "/plumber-fixing-pipes.png",
  pedreiro: "/mason-building-wall.jpg",
  pintor: "/painter-painting-wall.png",
  marceneiro: "/carpenter-woodworking.jpg",
  mecanico: "/mechanic-fixing-car.jpg",
  jardinagem: "/gardener-trimming-plants.jpg",
  jardineiro: "/gardener-trimming-plants.jpg",
  limpeza: "/cleaner-cleaning-house.jpg",
  diarista: "/cleaner-cleaning-house.jpg",
}

function categoryImage(category: string) {
  return CATEGORY_IMAGES[category?.toLowerCase()] ?? "/service-professional.jpg"
}

function formatLocation(need: PublicNeedPreview) {
  const place = [need.neighborhood, need.city].filter(Boolean).join(", ")
  return need.state ? `${place}${place ? " - " : ""}${need.state}` : place
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error("Falha ao carregar serviços")
  return (await response.json()) as { needs: PublicNeedPreview[] }
}

interface GuestNeedsPreviewProps {
  onInterest: (needId: string) => void
}

export function GuestNeedsPreview({ onInterest }: GuestNeedsPreviewProps) {
  const { data, error, isLoading } = useSWR("/api/public/needs", fetcher, { revalidateOnFocus: false })
  const needs = data?.needs ?? []

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando serviços">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 w-full animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (error || needs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-center">
        <Briefcase className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
          {error
            ? "Não foi possível carregar os serviços agora."
            : "Nenhum serviço aberto no momento. Entre para receber avisos de novos pedidos."}
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {needs.map((need) => (
        <li key={need.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
          <img
            src={need.image || categoryImage(need.category)}
            alt=""
            className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Badge variant="secondary" className="w-fit text-xs font-medium">
              {need.category}
            </Badge>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">{need.title}</h3>
            {formatLocation(need) && (
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{formatLocation(need)}</span>
              </p>
            )}
            <Button size="sm" className="mt-auto h-8 w-fit" onClick={() => onInterest(need.id)}>
              Tenho interesse
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
