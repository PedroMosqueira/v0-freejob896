"use client"

import { useEffect, useState } from "react"
import useSWR, { mutate as mutateGlobal } from "swr"
import { Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { getProfessionalWithdrawStatus, professionalWithdrawInterest } from "@/lib/needs-store"
import { describeWithdrawLock } from "@/lib/withdraw-policy"
import { ACTIVE_INTERESTS_KEY } from "@/lib/active-interests-client"

interface WithdrawInterestControlProps {
  needId: string
  /** Changes whenever chat messages change, so a new or declined bid refreshes the policy. */
  revalidationKey: number
  onWithdrawn?: () => void
}

export function withdrawStatusKey(needId: string) {
  return ["withdraw-status", needId] as const
}

export function WithdrawInterestControl({ needId, revalidationKey, onWithdrawn }: WithdrawInterestControlProps) {
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { data: policy, mutate } = useSWR(
    withdrawStatusKey(needId),
    () => getProfessionalWithdrawStatus(needId),
    { refreshInterval: 30000, revalidateOnFocus: true },
  )

  useEffect(() => {
    void mutate()
  }, [revalidationKey, mutate])

  // Re-check exactly when a lock expires instead of waiting for the next poll.
  useEffect(() => {
    if (!policy || policy.allowed) return
    const delay = Date.parse(policy.availableAt) - Date.now() + 1000
    if (delay <= 0) return
    const timer = setTimeout(() => void mutate(), Math.min(delay, 2_147_000_000))
    return () => clearTimeout(timer)
  }, [policy, mutate])

  if (!policy) return null

  if (!policy.allowed) {
    return (
      <p className="flex items-start gap-2 rounded-md border border-dashed px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{describeWithdrawLock(policy)}</span>
      </p>
    )
  }

  const handleWithdraw = async () => {
    setSubmitting(true)
    try {
      await professionalWithdrawInterest({ needId })
      toast({
        title: "Você desistiu do serviço",
        description: "Sua vaga foi liberada. O pedido voltou a ficar disponível para você.",
      })
      setConfirming(false)
      void mutate()
      void mutateGlobal(ACTIVE_INTERESTS_KEY)
      onWithdrawn?.()
    } catch (error) {
      toast({
        title: "Não foi possível desistir",
        description: error instanceof Error ? error.message.replace(/^Error:\s*/, "") : "Tente novamente.",
        variant: "destructive",
      })
      void mutate()
    } finally {
      setSubmitting(false)
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 bg-transparent"
        onClick={() => setConfirming(true)}
      >
        Desistir do serviço
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-destructive/40 p-3" role="group" aria-label="Confirmar desistência">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {policy.reason === "bid_timeout" ? "Seu lance será cancelado. " : ""}
        Sua vaga de serviço simultâneo é liberada na hora e o chat é encerrado. Você pode manifestar interesse
        novamente depois.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => setConfirming(false)} disabled={submitting}>
          Voltar
        </Button>
        <Button variant="destructive" size="sm" className="flex-1" onClick={handleWithdraw} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Confirmar
        </Button>
      </div>
    </div>
  )
}
