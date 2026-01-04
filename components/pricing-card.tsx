"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"
import { useState } from "react"
import type { SubscriptionPlan } from "@/lib/subscriptions"
import { Badge } from "@/components/ui/badge"

interface PricingCardProps {
  plan: SubscriptionPlan
  isFounder: boolean
  isFreeYear: boolean
  currentPlan?: string
}

export function PricingCard({ plan, isFounder, isFreeYear, currentPlan }: PricingCardProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
  const [loading, setLoading] = useState(false)

  const isFree = plan.slug === "free"
  const isCurrent = currentPlan === plan.slug
  const isPopular = plan.slug === "professional"

  // Calcular preço com desconto de fundador
  const monthlyPrice = isFounder && !isFree ? plan.priceMonthly * 0.5 : plan.priceMonthly

  const annualPrice = isFounder && !isFree ? plan.priceAnnual * 0.5 : plan.priceAnnual

  const displayPrice = billingCycle === "monthly" ? monthlyPrice : annualPrice / 12

  const handleSubscribe = async () => {
    if (isFree || isFreeYear) return

    setLoading(true)
    try {
      console.log("[v0] Creating checkout for plan:", plan.slug, "cycle:", billingCycle)

      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planSlug: plan.slug,
          billingCycle,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao criar checkout")
      }

      const { url } = await response.json()

      console.log("[v0] Redirecting to checkout:", url)
      window.location.href = url
    } catch (error) {
      console.error("[v0] Error creating checkout:", error)
      alert(error instanceof Error ? error.message : "Erro ao criar checkout. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={`relative p-6 flex flex-col ${isPopular ? "border-primary border-2 shadow-lg" : ""}`}>
      {isPopular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Mais Popular</Badge>}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        {isFree || isFreeYear ? (
          <div className="text-4xl font-bold">Grátis</div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">R$ {displayPrice.toFixed(2).replace(".", ",")}</span>
              <span className="text-muted-foreground">/mês</span>
            </div>

            {isFounder && (
              <div className="mt-2">
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                >
                  Desconto Fundador -50%
                </Badge>
              </div>
            )}

            {!isFreeYear && (
              <div className="flex gap-2 mt-4">
                <Button
                  variant={billingCycle === "monthly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBillingCycle("monthly")}
                  className="flex-1"
                >
                  Mensal
                </Button>
                <Button
                  variant={billingCycle === "annual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBillingCycle("annual")}
                  className="flex-1"
                >
                  Anual
                  <Badge variant="secondary" className="ml-2">
                    -17%
                  </Badge>
                </Button>
              </div>
            )}

            {billingCycle === "annual" && !isFreeYear && (
              <p className="text-xs text-muted-foreground mt-2">
                R$ {annualPrice.toFixed(2).replace(".", ",")} cobrado anualmente
              </p>
            )}
          </>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Button
        onClick={handleSubscribe}
        disabled={loading || isCurrent || isFreeYear || isFree}
        className="w-full"
        variant={isPopular ? "default" : "outline"}
      >
        {loading
          ? "Processando..."
          : isCurrent
            ? "Plano Atual"
            : isFreeYear
              ? "Grátis até 2027"
              : isFree
                ? "Plano Atual"
                : "Assinar Agora"}
      </Button>
    </Card>
  )
}
