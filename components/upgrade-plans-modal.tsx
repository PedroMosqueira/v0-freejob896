"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Zap } from "lucide-react"
import Link from "next/link"

interface Plan {
  id: string
  name: string
  description: string
  price_monthly: number
  features: string[]
  popular?: boolean
}

interface UpgradePlansModalProps {
  isOpen: boolean
  onClose: () => void
  plans?: Plan[]
}

export function UpgradePlansModal({ isOpen, onClose, plans = [] }: UpgradePlansModalProps) {
  const defaultPlans: Plan[] = [
    {
      id: "pro",
      name: "Plano Pro",
      description: "Perfeito para profissionais independentes",
      price_monthly: 29.90,
      features: [
        "Propostas ilimitadas",
        "Perfil destacado",
        "Suporte prioritário",
        "Análise de desempenho",
      ],
      popular: true,
    },
    {
      id: "business",
      name: "Plano Business",
      description: "Para empresas e equipes",
      price_monthly: 99.90,
      features: [
        "Tudo do Plano Pro",
        "Múltiplos usuários",
        "Gestão de projetos",
        "Relatórios avançados",
        "Suporte 24/7",
      ],
    },
  ]

  const displayPlans = plans.length > 0 ? plans : defaultPlans

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Você usou suas propostas gratuitas
          </DialogTitle>
          <DialogDescription>
            Adquira um plano para continuar manifestando interesse em serviços
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          {displayPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col transition-all ${
                plan.popular
                  ? "border-blue-500 dark:border-blue-400 shadow-lg scale-105"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              {plan.popular && (
                <Badge className="w-fit mb-3 bg-blue-600 hover:bg-blue-700">
                  Mais Popular
                </Badge>
              )}

              <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {plan.description}
              </p>

              <div className="mb-4">
                <span className="text-3xl font-bold">R$ {plan.price_monthly.toFixed(2)}</span>
                <span className="text-gray-600 dark:text-gray-400">/mês</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button asChild className="w-full" variant={plan.popular ? "default" : "outline"}>
                <Link href="/planos">Escolher Plano</Link>
              </Button>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Continuar Depois
          </Button>
          <Button asChild className="flex-1">
            <Link href="/planos">Ver Todos os Planos</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
