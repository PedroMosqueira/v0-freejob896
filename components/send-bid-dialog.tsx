"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useState, useEffect } from "react"
import { formatCurrency, MINIMUM_BID } from "@/lib/pricing"
import type { Need } from "@/lib/needs-store"
import { sendBidToChat } from "@/lib/needs-store"
import { FEATURES } from "@/lib/feature-flags"
import { estimateTravelCost, suggestedTravelExpense } from "@/lib/travel-estimate"

interface SendBidDialogProps {
  need: Need
  isOpen: boolean
  onClose: () => void
  currentUserEmail: string
  onSuccess?: () => void
}

function parseMoney(value: string) {
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export default function SendBidDialog({ need, isOpen, onClose, currentUserEmail, onSuccess }: SendBidDialogProps) {
  const [bidAmount, setBidAmount] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [includeExpenses, setIncludeExpenses] = useState(false)
  const [materials, setMaterials] = useState("")
  const [travel, setTravel] = useState("")

  const travelEstimate = FEATURES.travelEstimate ? estimateTravelCost(need.distance) : null

  useEffect(() => {
    if (!isOpen) {
      setBidAmount("")
      setIncludeExpenses(false)
      setMaterials("")
      setTravel("")
    }
  }, [isOpen])

  const handleToggleExpenses = (checked: boolean) => {
    setIncludeExpenses(checked)
    if (checked && !travel && travelEstimate) {
      setTravel(String(suggestedTravelExpense(travelEstimate)))
    }
  }

  const amount = parseMoney(bidAmount)
  const isValidAmount = amount >= MINIMUM_BID
  const expenses =
    FEATURES.bidExpenses && includeExpenses ? { materials: parseMoney(materials), travel: parseMoney(travel) } : null
  const expensesTotal = expenses ? expenses.materials + expenses.travel : 0
  const total = amount + expensesTotal

  const handleSendBid = async () => {
    if (amount < MINIMUM_BID) {
      alert(`O valor mínimo do lance é ${formatCurrency(MINIMUM_BID)}`)
      return
    }

    setIsSending(true)
    try {
      // sendBidToChat notifies the requester (bell + push) on the server.
      await sendBidToChat({
        needId: need.id,
        professionalEmail: currentUserEmail,
        requesterEmail: need.requesterEmail,
        bidAmount: amount,
        expenses: expensesTotal > 0 ? expenses : null,
      })

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Erro ao enviar lance:", error)
      alert(error instanceof Error && error.message ? error.message : "Erro ao enviar lance. Tente novamente.")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Lance</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bid-amount">{FEATURES.bidExpenses ? "Valor do serviço (mão de obra)" : "Valor do Lance"}</Label>
            <Input
              id="bid-amount"
              type="number"
              inputMode="decimal"
              min={MINIMUM_BID}
              step="0.01"
              placeholder={`Mínimo: ${formatCurrency(MINIMUM_BID)}`}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="text-lg"
            />
          </div>

          {FEATURES.bidExpenses && (
            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="include-expenses" className="flex flex-col gap-0.5">
                  <span>Incluir despesas</span>
                  <span className="text-xs font-normal text-muted-foreground">Materiais e deslocamento</span>
                </Label>
                <Switch id="include-expenses" checked={includeExpenses} onCheckedChange={handleToggleExpenses} />
              </div>

              {includeExpenses && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="expense-materials" className="text-xs">
                      Materiais / insumos
                    </Label>
                    <Input
                      id="expense-materials"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      placeholder="R$ 0,00"
                      value={materials}
                      onChange={(e) => setMaterials(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="expense-travel" className="text-xs">
                      Deslocamento
                    </Label>
                    <Input
                      id="expense-travel"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      placeholder="R$ 0,00"
                      value={travel}
                      onChange={(e) => setTravel(e.target.value)}
                    />
                  </div>
                  {travelEstimate && (
                    <p className="col-span-2 text-xs leading-relaxed text-muted-foreground">
                      Corrida ida e volta estimada: {formatCurrency(travelEstimate.min)}–
                      {formatCurrency(travelEstimate.max)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {isValidAmount && (
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg flex flex-col gap-2">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Resumo do Lance</div>

              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Valor do serviço:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(amount)}</span>
                </div>
                {expenses && expenses.materials > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Materiais:</span>
                    <span>{formatCurrency(expenses.materials)}</span>
                  </div>
                )}
                {expenses && expenses.travel > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Deslocamento:</span>
                    <span>{formatCurrency(expenses.travel)}</span>
                  </div>
                )}
                {expensesTotal > 0 && (
                  <div className="flex justify-between border-t border-green-200 pt-1.5 font-semibold dark:border-green-800">
                    <span>Total:</span>
                    <span className="text-green-600 dark:text-green-400">{formatCurrency(total)}</span>
                  </div>
                )}
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
