"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"

interface Plan {
  id: string
  name: string
  slug: string
  description: string
  price_monthly: number
  price_annual: number
  features: string[]
  is_active: boolean
}

interface PlansContentProps {
  plans?: Plan[]
  currentPlan?: string
  onSelectPlan?: (plan: Plan, billingCycle: "monthly" | "annual") => void
  isLoading?: boolean
}

export function PlansContent({
  plans = [],
  currentPlan,
  onSelectPlan,
  isLoading = false,
}: PlansContentProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")

  const getPrice = (plan: Plan) => {
    return billingCycle === "monthly" ? plan.price_monthly : plan.price_annual
  }

  const getSavings = (plan: Plan) => {
    const monthlyTotal = plan.price_monthly * 12
    const annualPrice = plan.price_annual
    const savings = monthlyTotal - annualPrice
    const percentage = Math.round((savings / monthlyTotal) * 100)
    return { savings, percentage }
  }

  const activePlans = plans.filter((p) => p.is_active)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-slate-50">
            Planos de Assinatura
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            Escolha o plano que melhor se adapta às suas necessidades
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-medium ${billingCycle === "monthly" ? "text-slate-900 dark:text-slate-50" : "text-slate-600 dark:text-slate-400"}`}>
              Mensal
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-slate-300 dark:bg-slate-700 transition-colors"
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  billingCycle === "annual" ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingCycle === "annual" ? "text-slate-900 dark:text-slate-50" : "text-slate-600 dark:text-slate-400"}`}>
              Anual
            </span>
            {billingCycle === "annual" && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ml-2">
                Economize 20%
              </Badge>
            )}
          </div>
        </div>

        {/* Plans Grid */}
        <div className="w-full overflow-x-auto mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 min-w-full md:min-w-0">
            {isLoading ? (
              <div className="col-span-full text-center text-slate-500 dark:text-slate-400">
                Carregando planos...
              </div>
            ) : activePlans.length === 0 ? (
              <div className="col-span-full text-center text-slate-500 dark:text-slate-400">
                Nenhum plano disponível no momento
              </div>
            ) : (
              activePlans.map((plan, index) => {
              const price = getPrice(plan)
              const savings = getSavings(plan)
              const isCurrentPlan = currentPlan === plan.slug
              const isPopular = index === 1

              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col p-4 sm:p-6 md:p-8 transition-all ${
                    isPopular
                      ? "ring-2 ring-blue-500 dark:ring-blue-400 md:transform md:scale-105"
                      : "hover:shadow-lg"
                  } ${isCurrentPlan ? "ring-2 ring-green-500 dark:ring-green-400" : ""} min-w-[320px] md:min-w-0`}
                >
                  {isPopular && (
                    <Badge className="absolute top-4 right-4 bg-blue-500 text-white dark:bg-blue-600">
                      Mais Popular
                    </Badge>
                  )}

                  {isCurrentPlan && (
                    <Badge className="absolute top-4 left-4 bg-green-500 text-white dark:bg-green-600">
                      Plano Atual
                    </Badge>
                  )}

                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-50">
                      {plan.name}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-4xl font-bold text-slate-900 dark:text-slate-50">
                          R$ {price.toFixed(2)}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          /{billingCycle === "monthly" ? "mês" : "ano"}
                        </span>
                      </div>
                      {billingCycle === "annual" && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          Economize R$ {savings.savings.toFixed(2)} ({savings.percentage}%)
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-4 mb-8">
                      {Array.isArray(plan.features) && plan.features.length > 0 ? (
                        plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {feature}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Plano padrão incluído
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => onSelectPlan?.(plan, billingCycle)}
                    disabled={isCurrentPlan}
                    className={`w-full ${
                      isPopular
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-50"
                    } ${isCurrentPlan ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isCurrentPlan ? "Plano Atual" : "Escolher Plano"}
                  </Button>
                </Card>
              )
              })
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold mb-8 text-center text-slate-900 dark:text-slate-50">
            Dúvidas Frequentes
          </h3>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6">
              <h4 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">
                Posso cancelar a qualquer momento?
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Sim, você pode cancelar sua assinatura a qualquer momento. Não há taxas de cancelamento.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6">
              <h4 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">
                Existe período de teste gratuito?
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Todos os usuários recebem 3 propostas gratuitas para começar. Após isso, você pode escolher um plano.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6">
              <h4 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">
                Qual é a diferença entre Mensal e Anual?
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                O plano anual oferece economia de 20% comparado ao plano mensal. Você pode alternar entre eles a qualquer momento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
