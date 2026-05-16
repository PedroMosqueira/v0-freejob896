"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { addNeedProposal, startChat, type Need } from "@/lib/needs-store"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Loader2, Heart } from "lucide-react"
import { createNotificationViaAPI } from "@/lib/notifications-client"
import { canUserExpressInterest, incrementInterestCount } from "@/lib/interest-manager"
import { PhoneValidationModal } from "@/components/phone-validation-modal"

interface InterestDialogProps {
  need: Need
  isOpen: boolean
  onClose: () => void
  currentUserEmail: string
  onActionSuccess: () => void
}

export default function InterestDialog({ need, isOpen, onClose, currentUserEmail, onActionSuccess }: InterestDialogProps) {
  const { toast } = useToast()
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProfessional, setIsProfessional] = useState(false)
  const [canExpress, setCanExpress] = useState(true)
  const [freeInterestsRemaining, setFreeInterestsRemaining] = useState(3)
  const [isCheckingPermission, setIsCheckingPermission] = useState(true)
  const [phoneValidated, setPhoneValidated] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  // Verificar permissão ao abrir o diálogo
  useEffect(() => {
    if (isOpen && currentUserEmail) {
      checkPermission()
    }
  }, [isOpen, currentUserEmail])

  const checkPermission = async () => {
    setIsCheckingPermission(true)
    try {
      const result = await canUserExpressInterest(currentUserEmail)
      setCanExpress(result.canExpressInterest)
      setIsProfessional(result.isProfessional || false)
      setFreeInterestsRemaining(result.freeInterestsRemaining || 3)
      
      // Verificar se telefone está validado
      if (result.isProfessional) {
        const profileResponse = await fetch(`/api/user/profile?email=${encodeURIComponent(currentUserEmail)}`)
        if (profileResponse.ok) {
          const profile = await profileResponse.json()
          setPhoneValidated(profile.phoneValidated || false)
        }
      }
    } catch (error) {
      console.error("Erro ao verificar permissão:", error)
      setCanExpress(false)
    } finally {
      setIsCheckingPermission(false)
    }
  }

  const handlePhoneValidationSuccess = (phone: string) => {
    setPhoneValidated(true)
    setShowPhoneModal(false)
    toast({
      title: "Telefone validado!",
      description: "Agora você pode manifestar interesse em serviços.",
      variant: "success",
    })
  }

  const handleManifestInterest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("[v0] Manifest interest - Phone validated:", phoneValidated)
    console.log("[v0] Manifest interest - Can express:", canExpress)
    
    // PASSO 1: Se é profissional, verificar se telefone está validado
    if (isProfessional && !phoneValidated) {
      console.log("[v0] Phone not validated - opening phone modal")
      setShowPhoneModal(true)
      return
    }

    // PASSO 2: Verificar se tem permissão para manifestar interesse
    if (!canExpress) {
      console.log("[v0] No permission to express interest")
      toast({
        title: "Propostas esgotadas",
        description: "Você usou suas 3 propostas gratuitas. Adquira um plano para continuar manifestando interesse.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Criar proposta de interesse simples
      await addNeedProposal({
        needId: need.id,
        professionalEmail: currentUserEmail,
        type: "interest_only",
        message: message || undefined,
      })

      // Incrementar contador de interesses
      if (isProfessional) {
        await incrementInterestCount(currentUserEmail)
      }

      // Notificar o solicitante
      await createNotificationViaAPI(
        need.requesterEmail,
        "Novo interesse em seu serviço",
        `Um profissional manifestou interesse em "${need.title}"`,
        "interest",
        need.id,
      )

      // Iniciar chat automático
      await startChat({
        needId: need.id,
        requesterEmail: need.requesterEmail,
        professionalEmail: currentUserEmail,
        reason: "interest",
        customText: message ? `Profissional manifestou interesse: "${message}"` : "Profissional manifestou interesse em seu serviço.",
      })

      toast({
        title: "Interesse manifestado!",
        description: "Seu interesse foi registrado. O chat foi iniciado para você conversar com o solicitante.",
        variant: "success",
      })

      setMessage("")
      onActionSuccess()
      onClose()
    } catch (error: any) {
      console.error("Erro ao manifestar interesse:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao manifestar interesse. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingPermission) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Tenho Interesse
            </DialogTitle>
            <DialogDescription>{need.title}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleManifestInterest} className="space-y-4">
            <div>
              <Label htmlFor="message">Mensagem (Opcional)</Label>
              <Textarea
                id="message"
                placeholder="Deixe uma mensagem para o solicitante..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {isProfessional && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Propostas livres disponíveis:</span> {freeInterestsRemaining}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Cada interesse manifesto consome 1 proposta
                </p>
              </div>
            )}

            {!phoneValidated && isProfessional && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                      Telefone não validado
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Valide seu telefone para manifestar interesse
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!canExpress && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                      Sem propostas disponíveis
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Adquira um plano para continuar manifestando interesse
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !phoneValidated || !canExpress}
                className="flex-1 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Manifestando...
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4" />
                    Manifestar Interesse
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PhoneValidationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        currentUserEmail={currentUserEmail}
        onSuccess={handlePhoneValidationSuccess}
      />
    </>
  )
}

interface InterestDialogProps {
  need: Need
  isOpen: boolean
  onClose: () => void
  currentUserEmail: string
  onActionSuccess: () => void
}

export default function InterestDialog({ need, isOpen, onClose, currentUserEmail, onActionSuccess }: InterestDialogProps) {
  const { toast } = useToast()
  const [visitDate, setVisitDate] = useState("")
  const [visitMessage, setVisitMessage] = useState("")
  const [acceptMessage, setAcceptMessage] = useState("")
  const [bidAmount, setBidAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProfessional, setIsProfessional] = useState(false)
  const [canExpress, setCanExpress] = useState(true)
  const [freeInterestsRemaining, setFreeInterestsRemaining] = useState(3)
  const [isCheckingPermission, setIsCheckingPermission] = useState(true)
  const [phoneValidated, setPhoneValidated] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  const bidValue = Number.parseFloat(bidAmount) || 0

  // Verificar permissão ao abrir o diálogo
  useEffect(() => {
    if (isOpen && currentUserEmail) {
      checkPermission()
    }
  }, [isOpen, currentUserEmail])

  const checkPermission = async () => {
    setIsCheckingPermission(true)
    try {
      const result = await canUserExpressInterest(currentUserEmail)
      setCanExpress(result.canExpressInterest)
      setIsProfessional(result.isProfessional || false)
      setFreeInterestsRemaining(result.freeInterestsRemaining || 3)
      
      // Verificar se telefone está validado
      if (result.isProfessional) {
        const profileResponse = await fetch(`/api/user/profile?email=${encodeURIComponent(currentUserEmail)}`)
        if (profileResponse.ok) {
          const profile = await profileResponse.json()
          setPhoneValidated(profile.phoneValidated || false)
        }
      }
    } catch (error) {
      console.error("Erro ao verificar permissão:", error)
      setCanExpress(false)
    } finally {
      setIsCheckingPermission(false)
    }
  }

  const handlePhoneValidationSuccess = (phone: string) => {
    setPhoneValidated(true)
    setShowPhoneModal(false)
    toast({
      title: "Telefone validado!",
      description: "Agora você pode manifestar interesse em serviços.",
      variant: "success",
    })
  }

  const handleProposeVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("[v0] Propose visit - Phone validated:", phoneValidated)
    console.log("[v0] Propose visit - Can express:", canExpress)
    
    // Verificar se telefone está validado
    if (isProfessional && !phoneValidated) {
      console.log("[v0] Phone not validated - opening phone modal")
      setShowPhoneModal(true)
      return // IMPORTANTE: Interromper execução
    }

    // Verificar se tem permissão para manifestar interesse
    if (!canExpress) {
      console.log("[v0] No permission to express interest - should show upgrade modal")
      toast({
        title: "Propostas esgotadas",
        description: "Você usou suas 3 propostas gratuitas. Adquira um plano para continuar.",
        variant: "destructive",
      })
      return
    }

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

      // Incrementar contador de interesses
      if (isProfessional) {
        await incrementInterestCount(currentUserEmail)
      }

      await createNotificationViaAPI(
        need.requesterEmail,
        "Proposta de visita recebida",
        `Um profissional propôs uma visita para "${need.title}"`,
        "proposal",
        need.id,
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

    console.log("[v0] Accept direct - Phone validated:", phoneValidated)
    console.log("[v0] Accept direct - Can express:", canExpress)

    // Verificar se telefone está validado
    if (isProfessional && !phoneValidated) {
      console.log("[v0] Phone not validated - opening phone modal")
      setShowPhoneModal(true)
      return // IMPORTANTE: Interromper execução
    }

    // Verificar se tem permissão para manifestar interesse
    if (!canExpress) {
      console.log("[v0] No permission to express interest")
      toast({
        title: "Propostas esgotadas",
        description: "Você usou suas 3 propostas gratuitas. Adquira um plano para continuar.",
        variant: "destructive",
      })
      return
    }

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
        need.id,
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
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tenho Interesse em: {need.title}</DialogTitle>
            <DialogDescription>Escolha como você gostaria de demonstrar interesse neste serviço.</DialogDescription>
          </DialogHeader>

          {/* Alerta se profissional sem telefone validado */}
          {isProfessional && !phoneValidated && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-semibold mb-1">Telefone não validado</p>
                <p>Você precisa validar seu telefone para manifestar interesse em serviços.</p>
              </div>
            </div>
          )}

          {/* Alerta se profissional sem permissão */}
          {isProfessional && !canExpress && phoneValidated && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300">
                <p className="font-semibold mb-1">Propostas gratuitas esgotadas</p>
                <p>Você usou suas 3 propostas gratuitas. Para continuar, será necessário um plano de assinatura.</p>
              </div>
            </div>
          )}

          {/* Indicador de propostas gratuitas restantes */}
          {isProfessional && canExpress && phoneValidated && freeInterestsRemaining > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-3">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p>
                  <strong>Propostas gratuitas:</strong> {freeInterestsRemaining} restant{freeInterestsRemaining === 1 ? "e" : "es"}
                </p>
              </div>
            </div>
          )}

          <Tabs
            defaultValue="propor-visita"
            className="w-full"
            disabled={isCheckingPermission || !canExpress}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="propor-visita" disabled={!canExpress}>
                Propor Visita
              </TabsTrigger>
              <TabsTrigger value="aceitar-direto" disabled={!canExpress}>
                Aceitar Direto
              </TabsTrigger>
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
                  <p>Você receberá {bidValue > 0 && formatCurrency(bidValue)} ao completar o serviço.</p>
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

      <PhoneValidationModal
        isOpen={showPhoneModal}
        onClose={() => {
          console.log("[v0] Phone modal closed")
          setShowPhoneModal(false)
        }}
        onSuccess={handlePhoneValidationSuccess}
        currentUserEmail={currentUserEmail}
      />
    </>
  )
}
