"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Rocket, Star, Camera, Zap, Crown } from 'lucide-react'
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface BoostOption {
  id: string
  name: string
  description: string
  price: number
  duration: string
  icon: typeof Rocket
  popular?: boolean
}

const boostOptions: BoostOption[] = [
  {
    id: "destaque",
    name: "Perfil em Destaque",
    description: "Apareça no topo dos resultados de busca",
    price: 29.90,
    duration: "7 dias",
    icon: Rocket,
    popular: true
  },
  {
    id: "badge",
    name: "Badge Premium",
    description: "Selo verificado no seu perfil",
    price: 9.90,
    duration: "mensal",
    icon: Star
  },
  {
    id: "fotos",
    name: "Fotos Ilimitadas",
    description: "Adicione quantas fotos quiser no portfólio",
    price: 14.90,
    duration: "mensal",
    icon: Camera
  },
  {
    id: "resposta",
    name: "Resposta Automática",
    description: "Bot responde clientes instantaneamente",
    price: 19.90,
    duration: "mensal",
    icon: Zap
  }
]

interface ProfileBoostCardProps {
  className?: string
}

export function ProfileBoostCard({ className = "" }: ProfileBoostCardProps) {
  const [selectedBoost, setSelectedBoost] = useState<string | null>(null)
  const { toast } = useToast()

  const handleBoost = (boostId: string) => {
    // TODO: Integrar com sistema de pagamento (Stripe)
    setSelectedBoost(boostId)
    const option = boostOptions.find(o => o.id === boostId)
    
    toast({
      title: "Em breve!",
      description: `${option?.name} será ativado após implementarmos o pagamento.`,
    })
  }

  return (
    <Card className={`p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        <h3 className="font-bold text-xl text-purple-900 dark:text-purple-100">
          Impulsione Seu Perfil
        </h3>
      </div>
      <p className="text-sm text-purple-700 dark:text-purple-300 mb-6">
        Destaque-se da concorrência e consiga mais clientes
      </p>
      
      <div className="grid md:grid-cols-2 gap-4">
        {boostOptions.map((option) => (
          <Card key={option.id} className={`relative p-4 hover:shadow-md transition-shadow ${selectedBoost === option.id ? 'ring-2 ring-purple-500' : ''}`}>
            {option.popular && (
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                Popular
              </div>
            )}
            <option.icon className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
            <h4 className="font-semibold mb-1">{option.name}</h4>
            <p className="text-xs text-muted-foreground mb-3 min-h-[2.5rem]">
              {option.description}
            </p>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  R$ {option.price.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  por {option.duration}
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={() => handleBoost(option.id)}
            >
              Ativar
            </Button>
          </Card>
        ))}
      </div>

      <div className="mt-6 p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
        <p className="text-xs text-center text-muted-foreground">
          Profissionais com perfil impulsionado recebem até 3x mais propostas
        </p>
      </div>
    </Card>
  )
}
