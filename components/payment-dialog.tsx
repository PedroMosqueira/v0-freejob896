"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Check, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE__PUBLISHABLE_KEY!)

interface PaymentDialogProps {
  open: boolean
  onClose: () => void
  proposalId: string
  needId: string
  bidAmount: number
  professionalName: string
  needTitle: string
}

function CheckoutForm({
  onSuccess,
  amounts,
}: {
  onSuccess: () => void
  amounts: { totalAmount: number; bidAmount: number; platformFee: number; professionalReceives: number }
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    })

    if (submitError) {
      setError(submitError.message || "Erro ao processar pagamento")
      setIsProcessing(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Valor do lance:</span>
          <span className="font-medium">{formatCurrency(amounts.bidAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Taxa da plataforma (15%):</span>
          <span className="font-medium">{formatCurrency(amounts.platformFee)}</span>
        </div>
        <div className="border-t border-blue-200 dark:border-blue-800 pt-2 flex justify-between font-semibold text-base">
          <span>Total a pagar:</span>
          <span className="text-blue-600 dark:text-blue-400">{formatCurrency(amounts.totalAmount)}</span>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-xs space-y-1">
        <p className="font-medium text-green-900 dark:text-green-100">Por que pagar pela plataforma?</p>
        <ul className="text-green-700 dark:text-green-300 space-y-0.5 ml-4 list-disc">
          <li>Proteção contra fraudes e problemas</li>
          <li>Sistema de disputas caso necessário</li>
          <li>Histórico de transações seguro</li>
          <li>Garantia de pagamento ao profissional</li>
        </ul>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Forma de pagamento</label>
        <PaymentElement />
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">{error}</div>
      )}

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400 flex items-center">
        <Check className="h-4 w-4 mr-2 text-green-600 flex-shrink-0" />
        <span>Pagamento seguro processado via Stripe</span>
      </div>

      <Button type="submit" disabled={!stripe || isProcessing} className="w-full" size="lg">
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processando pagamento...
          </>
        ) : (
          `Pagar ${formatCurrency(amounts.totalAmount)}`
        )}
      </Button>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        Você também pode pagar diretamente ao profissional fora da plataforma
      </p>
    </form>
  )
}

export function PaymentDialog({
  open,
  onClose,
  proposalId,
  needId,
  bidAmount,
  professionalName,
  needTitle,
}: PaymentDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [amounts, setAmounts] = useState<any>(null)

  useEffect(() => {
    const handleOpenDialog = async () => {
      if (open && !clientSecret) {
        setIsLoading(true)
        try {
          const response = await fetch("/api/payments/create-checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proposalId, needId }),
          })

          const data = await response.json()

          if (response.ok) {
            setClientSecret(data.clientSecret)
            setAmounts(data.amounts)
          } else {
            alert(data.error || "Erro ao criar pagamento")
            onClose()
          }
        } catch (error) {
          console.error("[v0] Erro ao criar checkout:", error)
          alert("Erro ao processar pagamento")
          onClose()
        } finally {
          setIsLoading(false)
        }
      }
    }

    handleOpenDialog()
  }, [open, clientSecret, proposalId, needId, onClose])

  const handleSuccess = () => {
    alert("Pagamento realizado com sucesso! O profissional foi notificado.")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagamento pela Plataforma</DialogTitle>
          <DialogDescription className="space-y-1">
            <div>
              <strong>Profissional:</strong> {professionalName}
            </div>
            <div>
              <strong>Serviço:</strong> {needTitle}
            </div>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Preparando pagamento seguro...</p>
          </div>
        ) : clientSecret && amounts ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
              },
              locale: "pt-BR",
            }}
          >
            <CheckoutForm onSuccess={handleSuccess} amounts={amounts} />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
