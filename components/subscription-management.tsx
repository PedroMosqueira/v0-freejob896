"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ManagedSubscription {
  planName: string | null
  status: string
  cancelAtPeriodEnd: boolean
  periodEnd: string | null
  refundEligible: boolean
  refundDeadline: string
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error("Falha ao carregar assinatura")
  return (await response.json()) as { subscription: ManagedSubscription | null }
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
const formatDate = (iso: string | null) => (iso ? dateFormatter.format(new Date(iso)) : "")

export function SubscriptionManagement() {
  const { data, isLoading, mutate } = useSWR("/api/subscriptions/manage", fetcher)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null)

  const subscription = data?.subscription
  if (isLoading || !subscription) return null

  const runAction = async (action: "cancel" | "resume") => {
    setPending(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/subscriptions/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({ tone: "error", text: result.error || "Não foi possível concluir." })
        return
      }
      setFeedback({ tone: "success", text: result.message })
      if (result.subscription === null) {
        // Plan ended immediately: reload so the auth context drops the paid plan everywhere.
        setTimeout(() => window.location.reload(), 2500)
      } else {
        await mutate({ subscription: result.subscription }, { revalidate: false })
      }
    } catch {
      setFeedback({ tone: "error", text: "Erro de conexão. Tente novamente." })
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Sua assinatura: {subscription.planName ?? "Plano pago"}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {subscription.cancelAtPeriodEnd
            ? `Renovação cancelada. Seu plano fica ativo até ${formatDate(subscription.periodEnd)}.`
            : `Renova automaticamente em ${formatDate(subscription.periodEnd)}.`}
        </p>
        {feedback && (
          <p
            role="status"
            className={`text-sm leading-relaxed ${feedback.tone === "error" ? "text-destructive" : "text-primary"}`}
          >
            {feedback.text}
          </p>
        )}
      </div>

      {subscription.cancelAtPeriodEnd ? (
        <Button onClick={() => runAction("resume")} disabled={pending} className="shrink-0">
          {pending ? "Reativando..." : "Reativar renovação"}
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={pending} className="shrink-0 bg-transparent">
              Cancelar assinatura
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
              <AlertDialogDescription className="leading-relaxed">
                {subscription.refundEligible
                  ? `Você está dentro do prazo de 7 dias (até ${formatDate(subscription.refundDeadline)}). O plano é encerrado agora e o valor pago é estornado integralmente no cartão.`
                  : `A renovação será cancelada e você não será mais cobrado. Seu plano continua ativo até ${formatDate(subscription.periodEnd)}. Não há estorno do período já pago.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Manter plano</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => runAction("cancel")}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {subscription.refundEligible ? "Cancelar e estornar" : "Cancelar renovação"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  )
}
