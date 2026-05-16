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
