"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { CheckoutReturn } from "@/components/checkout-return"
import { FREE_PLAN_RULES, SUBSCRIPTION_PRODUCTS, type SubscriptionProduct } from "@/lib/stripe-products"

const priceFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

const FREE_PLAN_FEATURES = [
  `${FREE_PLAN_RULES.totalProposals} propostas gratuitas`,
  `${FREE_PLAN_RULES.simultaneousServices} serviço simultâneo`,
]

export function PlansPageWrapper() {
  const { email, subscriptionPlan } = useAuth()
  const searchParams = useSearchParams()
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkoutSessionId = searchParams.get("session_id")
  const pendingNeedId = searchParams.get("need")
  const hasPaidPlan = subscriptionPlan === "simples" || subscriptionPlan === "agencia"

  const handleSubscribe = async (plan: SubscriptionProduct) => {
    if (!email) {
      setError("Você precisa estar autenticado")
      return
    }

    setSubscribingSlug(plan.slug)
    setError(null)

    try {
      const response = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, planSlug: plan.slug, billingCycle: "monthly" }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Erro ao iniciar checkout")
        return
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setError("Erro ao iniciar checkout")
    } catch (err) {
      console.error("[plans] Error starting checkout:", err)
      setError("Erro ao processar sua inscrição")
    } finally {
      setSubscribingSlug(null)
    }
  }

  if (checkoutSessionId) {
    return <CheckoutReturn sessionId={checkoutSessionId} needId={pendingNeedId} />
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="text-balance text-4xl font-bold sm:text-5xl">Planos de Assinatura</h1>
          <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
            Cobrança mensal no cartão. A diferença entre os planos é quantos serviços você atende ao mesmo tempo.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <PlanCard
            name="Gratuito"
            description="Para conhecer a plataforma"
            price={0}
            features={FREE_PLAN_FEATURES}
            isCurrent={!hasPaidPlan && Boolean(email)}
          />

          {SUBSCRIPTION_PRODUCTS.map((plan) => {
            const isCurrent = subscriptionPlan === plan.slug
            return (
              <PlanCard
                key={plan.id}
                name={plan.name}
                description={plan.description}
                price={plan.priceInCents / 100}
                features={plan.features}
                highlighted={plan.slug === "agencia"}
                isCurrent={isCurrent}
                action={
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={!email || hasPaidPlan || subscribingSlug !== null}
                    variant={plan.slug === "agencia" ? "default" : "outline"}
                    className="w-full font-semibold"
                  >
                    {isCurrent
                      ? "Seu plano atual"
                      : subscribingSlug === plan.slug
                        ? "Redirecionando..."
                        : "Assinar"}
                  </Button>
                }
              />
            )
          })}
        </div>

        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {"Serviço simultâneo é cada pedido em que você tem proposta aberta ou que está executando. Ao concluir o serviço, a vaga é liberada. Se você cancelar um serviço, a vaga fica ocupada por 2 horas."}
        </p>
      </div>
    </main>
  )
}

interface PlanCardProps {
  name: string
  description: string
  price: number
  features: string[]
  highlighted?: boolean
  isCurrent?: boolean
  action?: React.ReactNode
}

function PlanCard({ name, description, price, features, highlighted, isCurrent, action }: PlanCardProps) {
  return (
    <Card className={`relative flex flex-col gap-6 p-6 ${highlighted ? "border-2 border-primary" : ""}`}>
      {isCurrent && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Plano atual</Badge>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">{name}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-baseline gap-1 border-b border-border pb-6">
        <span className="text-3xl font-bold">{priceFormatter.format(price)}</span>
        {price > 0 && <span className="text-muted-foreground">/mês</span>}
      </div>

      <ul className="flex flex-1 flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-sm leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>

      {action}
    </Card>
  )
}
