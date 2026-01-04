"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"

export function SubscriptionSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    // Simular verificação do pagamento
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <Card className="p-12 max-w-md text-center">
          <Loader2 className="h-16 w-16 mx-auto mb-6 animate-spin text-primary" />
          <h1 className="text-2xl font-bold mb-2">Processando pagamento...</h1>
          <p className="text-muted-foreground">Aguarde enquanto confirmamos sua assinatura</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="p-12 max-w-md text-center">
        <div className="bg-green-100 dark:bg-green-950 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>

        <h1 className="text-3xl font-bold mb-4">Pagamento confirmado!</h1>

        <p className="text-muted-foreground mb-8">
          Sua assinatura foi ativada com sucesso. Agora você tem acesso a todos os recursos do seu plano.
        </p>

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/profile">Ir para Meu Perfil</Link>
          </Button>

          <Button asChild variant="outline" className="w-full bg-transparent">
            <Link href="/">Voltar para Início</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
