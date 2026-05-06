"use client"

import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { Check, Sparkles, Zap, Shield, Crown, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUserSubscription, type UserSubscription, PLAN_FEATURES } from "@/lib/subscription-manager"
import { useRouter } from "next/navigation"

export function UpgradePageContent() {
  const { email } = useAuth()
  const router = useRouter()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSubscription() {
      if (!email) {
        setLoading(false)
        return
      }

      const sub = await getUserSubscription(email)
      setSubscription(sub)
      setLoading(false)
    }

    loadSubscription()
  }, [email])

  const isPremium = false // Desabilitado temporariamente

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            <span>Plataforma 100% Gratuita no Lançamento</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Aproveite a plataforma gratuitamente</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Todos os recursos liberados. Planos Premium em breve!
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Free Plan */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-8 relative overflow-hidden shadow-xl">
            <div className="absolute top-4 right-4">
              <Crown className="h-8 w-8 text-yellow-300" />
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Gratuito</h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-white/80">/sempre</span>
              </div>
              <p className="text-sm text-white/90">Todos os recursos liberados</p>
            </div>

            <ul className="space-y-3 mb-6">
              {PLAN_FEATURES.free.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="secondary"
              className="w-full bg-white text-green-600 hover:bg-green-50 font-bold"
              size="lg"
              disabled
            >
              Plano Atual
            </Button>
          </div>

          {/* Premium Plan - Coming Soon */}
          <div className="bg-card border-2 border-dashed border-border rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-muted-foreground">Em breve</span>
              </div>
              <p className="text-sm text-muted-foreground">Novos recursos exclusivos</p>
            </div>

            <ul className="space-y-3 mb-6">
              {PLAN_FEATURES.premium.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full bg-transparent" size="lg" disabled>
              Em Desenvolvimento
            </Button>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Por que o Freejob é gratuito?</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-xl mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Sem Limites</h3>
              <p className="text-sm text-muted-foreground">
                Interesse ilimitado e lances ilimitados para todos os usuários
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Taxa Justa</h3>
              <p className="text-sm text-muted-foreground">
                Cobramos apenas 20% sobre transações realizadas na plataforma
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
