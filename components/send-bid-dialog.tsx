"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { formatCurrency, MINIMUM_BID } from "@/lib/pricing"
import type { Need } from "@/lib/needs-store"
import { sendBidToChat } from "@/lib/needs-store"
import { createNotificationViaAPI } from "@/lib/notifications-client"

interface SendBidDialogProps {
  need: Need
  isOpen: boolean
  onClose: () => void
  currentUserEmail: string
  onSuccess?: () => void
}

export default function SendBidDialog({ need, isOpen, onClose, currentUserEmail, onSuccess }: SendBidDialogProps) {
  const [bidAmount, setBidAmount] = useState("")
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setBidAmount("")
    }
  }, [isOpen])

  const handleSendBid = async () => {
    const amount = Number(bidAmount)
    if (amount < MINIMUM_BID) {
      alert(`O valor mínimo do lance é ${formatCurrency(MINIMUM_BID)}`)
      return
    }

    setIsSending(true)
    try {
      await sendBidToChat({
        needId: need.id,
        professionalEmail: currentUserEmail,
        requesterEmail: need.requesterEmail,
        bidAmount: amount,
      })

      await createNotificationViaAPI({
        userEmail: need.requesterEmail,
        title: "Nova proposta recebida",
        message: `Você recebeu uma proposta de ${formatCurrency(amount)} para "${need.title}"`,
        type: "new_proposal",
        needId: need.id,
      }).catch((err) => console.error("[v0] Failed to create bid notification:", err))

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Erro ao enviar lance:", error)
      alert("Erro ao enviar lance. Tente novamente.")
    } finally {
      setIsSending(false)
    }
  }

  const amount = Number(bidAmount) || 0
  const isValidAmount = amount >= MINIMUM_BID

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Lance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bid-amount">Valor do Lance</Label>
            <Input
              id="bid-amount"
              type="number"
              min={MINIMUM_BID}
              step="0.01"
              placeholder={`Mínimo: ${formatCurrency(MINIMUM_BID)}`}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="text-lg"
            />
          </div>

          {isValidAmount && (
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg space-y-3">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Resumo do Lance</div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between pb-2">
                  <span className="text-gray-600 dark:text-gray-400">Valor do serviço:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(amount)}</span>
                </div>

                <div className="bg-green-100 dark:bg-green-900 rounded p-2 text-xs text-green-700 dark:text-green-300">
                  Plataforma gratuita no primeiro ano! Sem taxas ou comissoes.
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
              Cancelar
            </Button>
            <Button
              onClick={handleSendBid}
              disabled={!isValidAmount || isSending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSending ? "Enviando..." : "Enviar Lance"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
