"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, AlertCircle } from "lucide-react"
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
      id: "basic",
      name: "Manual",
      description: "Pagamento por proposta",
      price_monthly: 29.90,
      features: [
        "Propostas ilimitadas",
        "Pagamento por proposta enviada",
        "Sem compromisso de contrato",
        "Acesso a todas as demandas",
      ],
    },
    {
      id: "semestral",
      name: "Semestral",
      description: "6 meses de acesso ilimitado",
      price_monthly: 24.90,
      features: [
        "Propostas ilimitadas",
        "Duração de 6 meses",
        "Acesso prioritário",
        "Suporte dedicado",
      ],
    },
    {
      id: "premium",
      name: "Premium",
      description: "Melhor oferta mensal",
      price_monthly: 22.90,
      features: [
        "Propostas ilimitadas",
        "Cancele quando quiser",
        "Perfil destacado",
        "Análise de desempenho",
      ],
      popular: true,
    },
  ]

  const displayPlans = plans.length > 0 ? plans : defaultPlans

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-3xl lg:max-w-5xl w-[95vw] sm:w-full">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle className="text-xl sm:text-2xl">Você usou suas propostas gratuitas</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Escolha um plano abaixo para continuar manifestando interesse em serviços
            </DialogDescription>
          </div>
          
          {/* Alert Box */}
          <div className="mt-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 sm:p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm sm:text-base text-amber-900 dark:text-amber-200">Créditos esgotados</p>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 mt-1">
                Você manifestou seus 3 interesses gratuitos. Assine um plano agora para continuar!
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 my-6">
          {displayPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col transition-all ${
                plan.popular
                  ? "border-2 border-cyan-500 dark:border-cyan-400 shadow-lg relative"
                  : "border border-gray-200 dark:border-gray-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-cyan-500 hover:bg-cyan-600 text-white">
                    Mais Popular
                  </Badge>
                </div>
              )}

              <div className="pt-2">
                <h3 className="font-bold text-base sm:text-lg mb-1">{plan.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {plan.description}
                </p>

                <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold">R$ {plan.price_monthly.toFixed(2)}</span>
                    <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">/mês</span>
                  </div>
                </div>

                <ul className="space-y-2 sm:space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  asChild 
                  className={`w-full font-semibold text-sm sm:text-base py-2 sm:py-2.5 ${
                    plan.popular
                      ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                      : "bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-200 dark:hover:bg-gray-300 dark:text-gray-900"
                  }`}
                >
                  <Link href="/planos">Assinar</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={onClose} className="flex-1 text-sm sm:text-base">
            Continuar Depois
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
