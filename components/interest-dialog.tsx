"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { addNeedProposal, startChat, type Need } from "@/lib/needs-store"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Loader2, Heart, Phone } from "lucide-react"
import { createNotificationViaAPI } from "@/lib/notifications-client"
import { canUserExpressInterest, incrementInterestCount } from "@/lib/interest-manager"
import { UpgradePlansModal } from "@/components/upgrade-plans-modal"

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
  const [userPhone, setUserPhone] = useState("")
  const [phoneInput, setPhoneInput] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [phoneValidationLoading, setPhoneValidationLoading] = useState(false)
  const [phoneValidationError, setPhoneValidationError] = useState("")
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

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
      console.log("[v0] canUserExpressInterest result:", result)
      setCanExpress(result.canExpressInterest)
      setIsProfessional(result.isProfessional || false)
      setFreeInterestsRemaining(result.freeInterestsRemaining || 3)
      setPhoneValidated(result.phoneVerified || false)
      
      console.log("[v0] Phone verified status from result:", result.phoneVerified)
      console.log("[v0] phoneValidated state will be set to:", result.phoneVerified || false)
    } catch (error) {
      console.error("Erro ao verificar permissão:", error)
      setCanExpress(false)
    } finally {
      setIsCheckingPermission(false)
    }
  }

  const formatPhoneInput = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 2) return cleaned
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
  }
    setPhoneValidated(true)
    setPhoneInput("")
    setVerificationCode("")
    setCodeSent(false)
    toast({
      title: "Telefone validado!",
      description: "Agora você pode manifestar interesse em serviços.",
      variant: "success",
    })
  }

  const requestPhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setPhoneValidationError("")
    setPhoneValidationLoading(true)

    try {
      const cleanPhone = phoneInput.replace(/\D/g, "")

      if (cleanPhone.length < 10) {
        throw new Error("Telefone inválido. Use o formato (11) 99999-9999")
      }

      console.log("[v0] Enviando requisição de verificação para:", cleanPhone)

      const response = await fetch("/api/phone/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          email: currentUserEmail,
        }),
      })

      console.log("[v0] Resposta da API:", response.status, response.statusText)
      
      if (!response.ok) {
        const data = await response.json()
        console.error("[v0] Erro da API:", data)
        throw new Error(data.message || `Erro ao enviar código (${response.status})`)
      }

      const data = await response.json()
      console.log("[v0] Sucesso:", data)

      setCodeSent(true)
      toast({
        title: "Código enviado",
        description: "Verifique seu SMS para o código de verificação.",
      })
    } catch (err: any) {
      console.error("[v0] Erro na requisição:", err)
      setPhoneValidationError(err.message || "Erro ao solicitar verificação")
    } finally {
      setPhoneValidationLoading(false)
    }
  }

  const submitPhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setPhoneValidationError("")
    setPhoneValidationLoading(true)

    try {
      const cleanPhone = phoneInput.replace(/\D/g, "")

      console.log("[v0] Verificando código para:", cleanPhone)

      const response = await fetch("/api/phone/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          email: currentUserEmail,
          code: verificationCode,
        }),
      })

      console.log("[v0] Resposta de verificação:", response.status)

      if (!response.ok) {
        const data = await response.json()
        console.error("[v0] Erro de verificação:", data)
        throw new Error(data.message || `Erro ao verificar código (${response.status})`)
      }

      const data = await response.json()
      console.log("[v0] Verificação bem-sucedida:", data)
      
      handlePhoneValidationSuccess(cleanPhone)
    } catch (err: any) {
      console.error("[v0] Erro na verificação:", err)
      setPhoneValidationError(err.message || "Erro ao verificar código")
    } finally {
      setPhoneValidationLoading(false)
    }
  }

  const handleManifestInterest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Se telefone não está validado, não faz nada (não enviar)
    if (!phoneValidated) {
      return
    }

    // PASSO 2: Se é profissional, verificar se tem créditos/plano
    if (isProfessional && !canExpress) {
      console.log("[v0] Professional without credits - opening upgrade modal")
      setShowUpgradeModal(true)
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

          <form onSubmit={phoneValidated ? handleManifestInterest : codeSent ? submitPhoneVerification : requestPhoneVerification} className="space-y-4">
            {!phoneValidated && !codeSent && (
              <>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
                    disabled={phoneValidationLoading}
                    className="text-base"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Digite seu telefone com DDD
                  </p>
                </div>
                {phoneValidationError && (
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{phoneValidationError}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {!phoneValidated && codeSent && (
              <>
                <div>
                  <Label htmlFor="code">Código de Verificação</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    disabled={phoneValidationLoading}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Código enviado para {phoneInput}
                  </p>
                </div>
                {phoneValidationError && (
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{phoneValidationError}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {phoneValidated && (
              <>
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

                {phoneValidated && isProfessional && !canExpress && (
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
                disabled={isSubmitting || phoneValidationLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  phoneValidationLoading ||
                  (phoneValidated && (isProfessional && !canExpress))
                }
                className="flex-1 gap-2"
              >
                {phoneValidationLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : !phoneValidated ? (
                  <>
                    <Phone className="h-4 w-4" />
                    {codeSent ? "Verificar Código" : "Enviar Código"}
                  </>
                ) : isSubmitting ? (
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
          </form>
        </DialogContent>
      </Dialog>

      <UpgradePlansModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  )
}
