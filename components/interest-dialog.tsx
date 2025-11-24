"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { addNeedProposal, startChat, type Need } from "@/lib/needs-store"
import { useToast } from "@/hooks/use-toast"
import {
  validateBidAmount,
  calculatePlatformFee,
  calculateTotalAmount,
  formatCurrency,
  MINIMUM_BID_AMOUNT,
} from "@/lib/pricing"
import { Info } from 'lucide-react'
import { createNotificationViaAPI } from "@/lib/notifications-client"

interface InterestDialogProps {
  need: Need
  isOpen: boolean
  onClose: () => void
  currentUserEmail: string
  onActionSuccess: () => void
}

export default function InterestDialog({
  need,
  isOpen,
  onClose,
  currentUserEmail,
  onActionSuccess,
}: InterestDialogProps) {
  const { toast } = useToast()
  const [visitDate, setVisitDate] = useState("")
  const [visitMessage, setVisitMessage] = useState("")
  const [acceptMessage, setAcceptMessage] = useState("")
  const [bidAmount, setBidAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const bidValue = Number.parseFloat(bidAmount) || 0

  const handleProposeVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!visitDate) {
      toast({
        title: "Data da visita obrigatória",
        description: "Por favor, informe a data e hora da visita.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await addNeedProposal({
        needId: need.id,
        professionalEmail: currentUserEmail,
        type: "visit_proposal",
        whenISO: new Date(visitDate).toISOString(),
        message: visitMessage || undefined,
      })

      await createNotificationViaAPI(
        need.requesterEmail,
        "Proposta de visita recebida",
        `Um profissional propôs uma visita para "${need.title}"`,
        "proposal",
        need.id
      )

      await startChat({
        needId: need.id,
        requesterEmail: need.requesterEmail,
        professionalEmail: currentUserEmail,
        reason: "visit",
        customText: visitMessage ? `Profissional propôs visita: "${visitMessage}"` : undefined,
      })

      toast({
        title: "Proposta de visita enviada!",
        description:
          "Sua proposta de visita foi enviada ao solicitante. O chat foi iniciado para combinar os detalhes.",
        variant: "success",
      })
      onActionSuccess()
      onClose()
    } catch (error: any) {
      console.error("Failed to propose visit or start chat:", error)
      toast({
        title: "Erro ao propor visita",
        description: error.message || "Ocorreu um erro ao enviar sua proposta.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAcceptDirect = async (e: React.FormEvent) => {
    e.preventDefault()

    if (bidValue < MINIMUM_BID_AMOUNT) {
      toast({
        title: "Valor inválido",
        description: `O valor mínimo do lance é ${formatCurrency(MINIMUM_BID_AMOUNT)}`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await addNeedProposal({
        needId: need.id,
        professionalEmail: currentUserEmail,
        type: "direct_acceptance",
        message: acceptMessage || undefined,
        bidAmount: bidValue,
      })

      await createNotificationViaAPI(
        need.requesterEmail,
        "Proposta de aceitação direta",
        `Um profissional aceitou diretamente seu serviço "${need.title}" por ${formatCurrency(bidValue)}`,
        "proposal",
        need.id
      )

      await startChat({
        needId: need.id,
        requesterEmail: need.requesterEmail,
        professionalEmail: currentUserEmail,
        reason: "direct",
        customText: acceptMessage ? `Profissional aceitou o serviço: "${acceptMessage}"` : undefined,
      })

      toast({
        title: "Proposta de aceitação direta enviada!",
        description:
          "Sua proposta de aceitação direta foi enviada ao solicitante. O chat foi iniciado para combinar os detalhes.",
        variant: "success",
      })
      onActionSuccess()
      onClose()
    } catch (error: any) {
      console.error("Failed to accept direct or start chat:", error)
      toast({
        title: "Erro ao aceitar serviço",
        description: error.message || "Ocorreu um erro ao enviar sua proposta de aceitação.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tenho Interesse em: {need.title}</DialogTitle>
          <DialogDescription>Escolha como você gostaria de demonstrar interesse neste serviço.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="propor-visita" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="propor-visita">Propor Visita</TabsTrigger>
            <TabsTrigger value="aceitar-direto">Aceitar Direto</TabsTrigger>
          </TabsList>
          <TabsContent value="propor-visita" className="mt-4">
            <form onSubmit={handleProposeVisit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="visit-date">Data e Hora da Visita</Label>
                <Input
                  id="visit-date"
                  type="datetime-local"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="visit-message">Mensagem (opcional)</Label>
                <Textarea
                  id="visit-message"
                  placeholder="Ex: Posso ir amanhã de manhã para avaliar o local."
                  value={visitMessage}
                  onChange={(e) => setVisitMessage(e.target.value)}
                />
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  Após a visita, você poderá definir o valor do serviço e enviar uma proposta formal ao solicitante.
                </p>
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-600/90" disabled={isSubmitting}>
                {isSubmitting ? "Enviando Proposta..." : "Enviar Proposta de Visita"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="aceitar-direto" className="mt-4">
            <form onSubmit={handleAcceptDirect} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bid-amount">Valor do Serviço</Label>
                <Input
                  id="bid-amount"
                  type="number"
                  step="0.01"
                  min={MINIMUM_BID_AMOUNT}
                  placeholder={`Mínimo: ${formatCurrency(MINIMUM_BID_AMOUNT)}`}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  required
                />
                {bidValue >= MINIMUM_BID_AMOUNT && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>Valor do lance:</span>
                      <span className="text-blue-600 dark:text-blue-400">{formatCurrency(bidValue)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accept-message">Mensagem (opcional)</Label>
                <Textarea
                  id="accept-message"
                  placeholder="Ex: Aceito o serviço! Podemos combinar os detalhes no chat."
                  value={acceptMessage}
                  onChange={(e) => setAcceptMessage(e.target.value)}
                />
              </div>
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  Você receberá {bidValue > 0 && formatCurrency(bidValue)} ao completar o serviço.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-600/90"
                disabled={isSubmitting || bidValue < MINIMUM_BID_AMOUNT}
              >
                {isSubmitting ? "Enviando Aceitação..." : "Aceitar Serviço Direto"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
