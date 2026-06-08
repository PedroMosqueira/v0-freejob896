"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { COUNTRIES } from "@/lib/countries"

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

export function PlansPageWrapper() {
  const { email, isSubscribed, subscriptionPlan } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPhoneDialog, setShowPhoneDialog] = useState(false)
  const [phoneInput, setPhoneInput] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [phoneValidationLoading, setPhoneValidationLoading] = useState(false)
  const [countryCode, setCountryCode] = useState("+55")
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [phoneValidated, setPhoneValidated] = useState(false)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/plans")
        const data = await response.json()
        
        if (response.ok) {
          const paidPlans = (data.plans || []).filter((plan: Plan) => 
            plan.slug === "simples" || plan.slug === "agencia"
          )
          setPlans(paidPlans)
        } else {
          setError("Erro ao carregar planos")
        }
      } catch (err) {
        console.error("[v0] Error fetching plans:", err)
        setError("Erro ao carregar planos")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlans()
  }, [])

  const handleSubscribeClick = (plan: Plan) => {
    // Se já está inscrito em um plano, avisa
    if (isSubscribed) {
      setError(`Você já está inscrito no plano ${subscriptionPlan}`)
      return
    }

    setSelectedPlan(plan)
    setShowPhoneDialog(true)
  }

  const handleSendVerificationCode = async () => {
    if (!phoneInput.trim()) {
      setError("Por favor, insira um número de telefone")
      return
    }

    setPhoneValidationLoading(true)
    try {
      const response = await fetch("/api/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone: countryCode + phoneInput.replace(/\D/g, ""),
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setCodeSent(true)
        setError(null)
      } else {
        setError(data.error || "Erro ao enviar código")
      }
    } catch (err) {
      console.error("[v0] Error sending code:", err)
      setError("Erro ao enviar código de verificação")
    } finally {
      setPhoneValidationLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError("Por favor, insira o código de verificação")
      return
    }

    setPhoneValidationLoading(true)
    try {
      const response = await fetch("/api/verify-phone", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: verificationCode,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setPhoneValidated(true)
        setError(null)
        // Prosseguir com inscrição automaticamente
        if (selectedPlan) {
          proceedWithSubscription(selectedPlan)
        }
      } else {
        setError(data.error || "Código inválido")
      }
    } catch (err) {
      console.error("[v0] Error verifying code:", err)
      setError("Erro ao verificar código")
    } finally {
      setPhoneValidationLoading(false)
    }
  }

  const proceedWithSubscription = async (plan: Plan) => {
    if (!email) {
      setError("Você precisa estar autenticado")
      return
    }

    setIsSubscribing(true)
    setError(null)

    try {
      const response = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          planSlug: plan.slug,
          billingCycle: "monthly",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Erro ao iniciar checkout")
        return
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setError("Erro ao iniciar checkout")
      }
    } catch (err) {
      console.error("[v0] Error starting checkout:", err)
      setError("Erro ao processar sua inscrição")
    } finally {
      setIsSubscribing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Carregando planos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Planos de Assinatura</h1>
          <p className="text-lg text-muted-foreground">
            Escolha o plano que melhor se adapta às suas necessidades
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col p-8 transition-all ${
                plan.slug === "agencia"
                  ? "border-2 border-cyan-500 dark:border-cyan-400 shadow-xl lg:scale-105"
                  : "border border-gray-200 dark:border-gray-800"
              }`}
            >
              {/* Popular Badge */}
              {plan.slug === "agencia" && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold">
                    Mais Popular
                  </Badge>
                </div>
              )}

              {/* Plan Info */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">R$ {plan.price_monthly.toFixed(2)}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Subscribe Button */}
              <Button
                onClick={() => handleSubscribeClick(plan)}
                disabled={isSubscribing || !email}
                className={`w-full font-semibold py-3 text-base ${
                  plan.slug === "agencia"
                    ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                    : "bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-200 dark:hover:bg-gray-300 dark:text-gray-900"
                }`}
              >
                {isSubscribing ? "Redirecionando..." : "Assinar"}
              </Button>
            </Card>
          ))}
        </div>

        {/* Phone Verification Dialog */}
        <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verificar Telefone</DialogTitle>
              <DialogDescription>
                Por favor, verifique seu telefone para continuar com a inscrição
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            )}

            {!codeSent ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="country">País</Label>
                  <select
                    id="country"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md mt-1"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="11 98765-4321"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleSendVerificationCode}
                  disabled={phoneValidationLoading || !phoneInput.trim()}
                  className="w-full"
                >
                  {phoneValidationLoading ? "Enviando..." : "Enviar Código"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="code">Código de Verificação</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleVerifyCode}
                  disabled={phoneValidationLoading || !verificationCode.trim()}
                  className="w-full"
                >
                  {phoneValidationLoading ? "Verificando..." : "Verificar"}
                </Button>

                <Button
                  onClick={() => {
                    setCodeSent(false)
                    setVerificationCode("")
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Voltar
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
