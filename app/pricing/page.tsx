import { getSubscriptionPlans, getUserSubscription } from "@/lib/subscriptions"
import { PricingCard } from "@/components/pricing-card"
import { FounderBadge } from "@/components/founder-badge"

export default async function PricingPage() {
  const [plans, subscription] = await Promise.all([getSubscriptionPlans(), getUserSubscription()])

  const isFounder = subscription?.isFounder || false
  const currentYear = new Date().getFullYear()
  const isFreeYear = currentYear === 2026

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-balance">Escolha seu plano</h1>

          {isFreeYear && (
            <div className="bg-primary/10 border-2 border-primary rounded-lg p-6 mb-6 max-w-2xl mx-auto">
              <p className="text-lg font-semibold text-primary mb-2">
                🎉 Ano de lançamento - 100% GRÁTIS até 31/12/2026!
              </p>
              <p className="text-sm text-muted-foreground">
                Cadastre-se agora e ganhe status de <strong>Membro Fundador</strong> com 50% de desconto vitalício a
                partir de 2027
              </p>
            </div>
          )}

          {isFounder && !isFreeYear && (
            <div className="flex justify-center mb-6">
              <FounderBadge />
            </div>
          )}

          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            {isFreeYear
              ? "Explore todos os recursos gratuitamente durante 2026"
              : "Planos simples e transparentes para profissionais e empresas"}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isFounder={isFounder}
              isFreeYear={isFreeYear}
              currentPlan={subscription?.plan?.slug}
            />
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center text-sm text-muted-foreground max-w-2xl mx-auto">
          <p className="mb-4">Todos os planos incluem 14 dias de garantia de reembolso. Cancele a qualquer momento.</p>
          {isFounder && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="font-semibold text-amber-900 dark:text-amber-100">🏆 Você é Membro Fundador!</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Você tem 50% de desconto vitalício em qualquer plano pago
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
