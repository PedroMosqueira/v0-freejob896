"use client"

import { useAuth } from "@/hooks/use-auth"
import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { startChat, type Need } from "@/lib/needs-store"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Loader2, Heart } from "lucide-react"
import { expressInterest } from "@/lib/interest-manager"
import { UpgradePlansModal } from "@/components/upgrade-plans-modal"
import { WhatsAppVerificationPanel } from "@/components/whatsapp-verification-panel"
import { mutate } from "swr"
import { ACTIVE_INTERESTS_KEY } from "@/lib/active-interests-client"

interface InterestDialogProps {
  need: Need
  isOpen: boolean
  onClose: () => void
  currentUserEmail: string
  onActionSuccess: () => void
}

export default function InterestDialog({ need, isOpen, onClose, currentUserEmail, onActionSuccess }: InterestDialogProps) {
  const { toast } = useToast()
  const { subscriptionPlan, isSubscribed, phoneVerified: hookPhoneVerified, phoneVerifiedLoaded, email: authEmail } = useAuth()
  const [phoneVerifiedInFlow, setPhoneVerifiedInFlow] = useState(false)
  const phoneVerified = hookPhoneVerified || phoneVerifiedInFlow
  const hasPaidPlan = isSubscribed || (subscriptionPlan && subscriptionPlan.toLowerCase() !== "free")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProfessional, setIsProfessional] = useState(false)
  const [canExpress, setCanExpress] = useState(true)
  const [freeInterestsRemaining, setFreeInterestsRemaining] = useState(3)
  const [isCheckingPermission, setIsCheckingPermission] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isProfessionalCheckbox, setIsProfessionalCheckbox] = useState(false)

  const handleManifestInterest = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const userEmail = authEmail || currentUserEmail

      // Check, insert and credit consumption all happen on the server.
      const result = await expressInterest(need.id)

      if (!result.success) {
        if (result.needsUpgrade) {
          toast({ title: "Créditos insuficientes", description: result.reason, variant: "destructive" })
          setShowUpgradeModal(true)
        } else if (result.needsPhoneValidation) {
          toast({ title: "Validação necessária", description: result.reason, variant: "destructive" })
        } else {
          toast({ title: "Não foi possível continuar", description: result.reason, variant: "destructive" })
        }
        return
      }

      await startChat({
        needId: need.id,
        requesterEmail: need.requesterEmail,
        professionalEmail: userEmail,
        reason: "other",
        customText: "Profissional manifestou interesse em seu serviço.",
      })

      toast({
        title: "Interesse manifestado!",
        description: "Seu interesse foi registrado. O chat foi iniciado.",
        variant: "success",
      })

      void mutate(ACTIVE_INTERESTS_KEY)
      onActionSuccess()
      onClose()
    } catch (error: any) {
      console.error("Erro ao manifestar interesse:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao manifestar interesse.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {isCheckingPermission && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Verificando...</DialogTitle>
              <DialogDescription>
                Estamos verificando suas permissões
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {!isCheckingPermission && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Tenho Interesse
              </DialogTitle>
              <DialogDescription>{need.title}</DialogDescription>
            </DialogHeader>

            <form 
              onSubmit={(e) => {
                e.preventDefault()
                
                // Phone validation happens inside WhatsAppVerificationPanel.
                if (!phoneVerified) return
                
                // Se telefone validado, verificar créditos e manifestar interesse
                handleManifestInterest(e)
              }} 
              className="space-y-4"
            >
              {!phoneVerified && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <input
                      id="professional-checkbox"
                      type="checkbox"
                      checked={isProfessionalCheckbox}
                      onChange={(e) => setIsProfessionalCheckbox(e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <Label htmlFor="professional-checkbox" className="mb-0 cursor-pointer">
                      Sou profissional <span className="text-muted-foreground">(obrigatório)</span>
                    </Label>
                  </div>
                  {isProfessionalCheckbox ? (
                    <WhatsAppVerificationPanel
                      isProfessional
                      onVerified={(_phone, message) => {
                        setPhoneVerifiedInFlow(true)
                        toast({ title: "Telefone verificado!", description: message, variant: "success" })
                      }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Para manifestar interesse, confirme que é profissional e valide seu WhatsApp.
                    </p>
                  )}
                </div>
              )}

              {phoneVerified && (
                <>
                  {isProfessional && !hasPaidPlan && (
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">Propostas livres disponíveis:</span> {freeInterestsRemaining}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Cada interesse manifesto consome 1 proposta
                      </p>
                    </div>
                  )}

                  {isProfessional && !canExpress && !hasPaidPlan && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                            Propostas esgotadas
                          </p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            Adquira um plano para continuar manifestando interesse
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
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
                {phoneVerified && (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    // Se telefone validado mas sem créditos, abrir modal
                    if (phoneVerified && isProfessional && !canExpress && !hasPaidPlan) {
                      e.preventDefault()
                      setShowUpgradeModal(true)
                      return
                    }
                  }}
                  className="flex-1 gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Manifestando...
                    </>
                  ) : isProfessional && !canExpress && !hasPaidPlan ? (
                    <>
                      <Heart className="h-4 w-4" />
                      Escolher Plano
                    </>
                  ) : (
                    <>
                      <Heart className="h-4 w-4" />
                      Manifestar Interesse
                    </>
                  )}
                </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <UpgradePlansModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userEmail={currentUserEmail}
        needId={need.id}
        onUpgradeSuccess={() => {
          // Após upgrade bem-sucedido, tentar manifestar interesse novamente
          setShowUpgradeModal(false)
          handleManifestInterest(new Event("click") as unknown as React.FormEvent)
        }}
      />
    </>
  )
}
