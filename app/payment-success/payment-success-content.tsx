"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentIntentId = searchParams.get("payment_intent")

      if (paymentIntentId) {
        // Aguardar alguns segundos para o webhook processar
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }

      setIsVerifying(false)
    }

    verifyPayment()
  }, [searchParams])

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Verificando pagamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pagamento Confirmado!</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Seu pagamento foi processado com sucesso. O profissional foi notificado e pode iniciar o serviço.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-sm text-left space-y-2">
          <p className="font-medium text-blue-900 dark:text-blue-100">O que acontece agora?</p>
          <ul className="space-y-1 text-blue-700 dark:text-blue-300 text-xs">
            <li>✓ O profissional foi notificado sobre o pagamento</li>
            <li>✓ Você pode acompanhar o andamento pelo chat</li>
            <li>✓ Após a conclusão, você poderá avaliar o serviço</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1 bg-transparent">
            <Link href="/">Voltar ao Início</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/">Ver Minhas Solicitações</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
