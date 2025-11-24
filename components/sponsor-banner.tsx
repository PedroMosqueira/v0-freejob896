"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Store } from 'lucide-react'

interface Sponsor {
  id: string
  name: string
  description: string
  offer: string
  logo: string
  link: string
  discount: string
}

const sponsors: Sponsor[] = [
  {
    id: "leroy",
    name: "Leroy Merlin",
    description: "Materiais de construção e ferramentas profissionais",
    offer: "10% de desconto para profissionais Freejob",
    logo: "/placeholder.svg?height=80&width=200&text=Leroy",
    link: "https://www.leroymerlin.com.br", // Adicionar parâmetro de tracking
    discount: "10% OFF"
  },
  {
    id: "telhanorte",
    name: "Telhanorte",
    description: "Tudo para sua obra e reforma",
    offer: "Frete grátis acima de R$ 200",
    logo: "/placeholder.svg?height=80&width=200&text=Telhanorte",
    link: "https://www.telhanorte.com.br",
    discount: "Frete Grátis"
  },
  {
    id: "cc",
    name: "C&C Casa e Construção",
    description: "Materiais de construção com os melhores preços",
    offer: "5% de cashback em todas as compras",
    logo: "/placeholder.svg?height=80&width=200&text=C&C",
    link: "https://www.cec.com.br",
    discount: "5% Cashback"
  }
]

interface SponsorBannerProps {
  className?: string
}

export function SponsorBanner({ className = "" }: SponsorBannerProps) {
  // Rotaciona entre os sponsors
  const randomSponsor = sponsors[Math.floor(Math.random() * sponsors.length)]

  const handleClick = () => {
    console.log("[v0] Sponsor banner clicked:", randomSponsor.name)
    // TODO: Track conversion
    window.open(randomSponsor.link, "_blank", "noopener,noreferrer")
  }

  return (
    <Card className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Store className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">PARCEIRO OFICIAL</span>
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="flex-shrink-0">
          <img
            src={randomSponsor.logo || "/placeholder.svg"}
            alt={randomSponsor.name}
            className="h-16 w-auto object-contain"
          />
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-bold text-lg mb-1 text-blue-900 dark:text-blue-100">
            {randomSponsor.name}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
            {randomSponsor.description}
          </p>
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
            <span>{randomSponsor.offer}</span>
          </div>
        </div>
        
        <div className="flex-shrink-0">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            onClick={handleClick}
          >
            Ver Ofertas
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground text-center md:text-right mt-4">
        Anúncio patrocinado
      </p>
    </Card>
  )
}
