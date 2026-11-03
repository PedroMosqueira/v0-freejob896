"use client"

import type React from "react"
import { useState } from "react"
import useSWR from "swr"
import { Clock, HelpCircle, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { cancelNeed, type Need } from "@/lib/needs-store"
import { confirmServiceStillNeeded, getRequesterCancelState } from "@/lib/requester-confirmation"

export const requesterCancelStateKey = (needId: string) => ["requester-cancel-state", needId] as const

export function useRequesterCancelState(needId: string | undefined, enabled: boolean) {
  return useSWR(enabled && needId ? requesterCancelStateKey(needId) : null, () => getRequesterCancelState(needId!))
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

interface ServiceStillNeededDialogProps {
  need: Need
  currentUserEmail: string
  onClose: () => void
  onConfirmed: () => void
  onCancelled: () => void
}

export function ServiceStillNeededDialog({
  need,
  currentUserEmail,
  onClose,
  onConfirmed,
  onCancelled,
}: ServiceStillNeededDialogProps) {
  const [step, setStep] = useState<"ask" | "confirm-cancel">("ask")
  const [pending, setPending] = useState<"confirm" | "cancel" | null>(null)

  const handleConfirm = async () => {
    setPending("confirm")
    const result = await confirmServiceStillNeeded(need.id)
    setPending(null)
    if (!result.ok) {
      toast({ title: result.error || "Não foi possível confirmar.", variant: "destructive" })
      return
    }
    onConfirmed()
  }

  const handleCancel = async () => {
    setPending("cancel")
    try {
      await cancelNeed(need.id, currentUserEmail)
      toast({ title: "Pedido cancelado", description: "Os profissionais interessados foram avisados." })
      onCancelled()
    } catch {
      toast({ title: "Não foi possível cancelar o pedido. Tente novamente.", variant: "destructive" })
      setPending(null)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
            <HelpCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <DialogTitle className="text-balance">
            {step === "ask" ? "Você ainda precisa do serviço solicitado?" : "Cancelar este pedido?"}
          </DialogTitle>
          <DialogDescription className="text-pretty">
            <span className="font-medium text-foreground">{`"${need.title}"`}</span>
          </DialogDescription>
        </DialogHeader>

        {step === "ask" ? (
          <div className="flex flex-col gap-4">
            <p className="flex gap-2 rounded-lg bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Ao confirmar, o chat é liberado e o pedido não poderá ser cancelado nas próximas 2 horas, para que
                os profissionais possam se programar.
              </span>
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleConfirm} disabled={!!pending} className="h-11">
                {pending === "confirm" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Sim, ainda preciso
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep("confirm-cancel")}
                disabled={!!pending}
                className="h-11 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Cancelar serviço
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              O pedido sai das buscas e os profissionais interessados são avisados.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="destructive" onClick={handleCancel} disabled={!!pending} className="h-11">
                {pending === "cancel" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Sim, cancelar pedido
              </Button>
              <Button variant="ghost" onClick={() => setStep("ask")} disabled={!!pending} className="h-11">
                Voltar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Replaces the cancel action with a notice while the requester's cancellation is locked. */
export function RequesterCancelLock({ needId, children }: { needId: string; children: React.ReactNode }) {
  const { data } = useRequesterCancelState(needId, true)
  const lockedUntil = data?.cancelLockedUntil
  if (!lockedUntil || new Date(lockedUntil).getTime() <= Date.now()) return <>{children}</>

  return (
    <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        Você confirmou que ainda precisa deste serviço. O cancelamento fica disponível a partir das{" "}
        <span className="font-semibold text-foreground">{formatTime(lockedUntil)}</span>.
      </span>
    </p>
  )
}
