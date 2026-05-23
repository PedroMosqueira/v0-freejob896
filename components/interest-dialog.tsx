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
import { COUNTRIES } from "@/lib/countries"

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
  const [phoneInput, setPhoneInput] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [phoneValidationLoading, setPhoneValidationLoading] = useState(false)
  const [phoneValidationError, setPhoneValidationError] = useState("")
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isProfessionalCheckbox, setIsProfessionalCheckbox] = useState(false)
  const [countryCode, setCountryCode] = useState("+55")

  // Format phone input with DDD parentheses
  const formatPhoneInput = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 2) return cleaned
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
  }

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
      setIsProfessionalCheckbox(result.isProfessional || false)
      setFreeInterestsRemaining(result.freeInterestsRemaining || 3)
      setPhoneValidated(result.phoneVerified || false)
      console.log("[v0] phoneVerified from DB:", result.phoneVerified)
    } catch (error) {
      console.error("Erro ao verificar permissão:", error)
      setCanExpress(false)
    } finally {
      setIsCheckingPermission(false)
    }
  }

  const handlePhoneValidationSuccess = (phone: string) => {
    setPhoneValidated(true)
    setPhoneInput("")
    setVerificationCode("")
    setCodeSent(false)
    // Verificar créditos após validar telefone
    checkCreditsAfterPhoneValidation()
  }

  const checkCreditsAfterPhoneValidation = async () => {
    try {
      const result = await canUserExpressInterest(currentUserEmail)
      setCanExpress(result.canExpressInterest)
      setIsProfessional(result.isProfessional || false)
      setFreeInterestsRemaining(result.freeInterestsRemaining || 3)
      
      // Se é profissional e não tem créditos, abre modal de planos
      if (result.isProfessional && !result.canExpressInterest) {
        toast({
          title: "Telefone validado!",
          description: "Agora escolha um plano para manifestar interesse.",
        })
        setShowUpgradeModal(true)
      } else {
        toast({
          title: "Telefone validado!",
          description: "Agora você pode manifestar interesse em serviços.",
          variant: "success",
        })
      }
    } catch (error) {
      console.error("Erro ao verificar créditos:", error)
      toast({
        title: "Telefone validado!",
        description: "Agora você pode manifestar interesse em serviços.",
        variant: "success",
      })
    }
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

      const response = await fetch("/api/phone/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          email: currentUserEmail,
          countryCode: countryCode,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || `Erro ao enviar código (${response.status})`)
      }

      setCodeSent(true)
      toast({
        title: "Código enviado",
        description: "Verifique seu WhatsApp para o código de verificação.",
      })
    } catch (err: any) {
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
          isProfessional: isProfessionalCheckbox,
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
      
      setIsProfessional(isProfessionalCheckbox)
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
    
    // Se telefone não está validado, não faz nada
    if (!phoneValidated) {
      return
    }

    // Se é profissional, verificar se tem cr������ditos/plano
    if (isProfessional && !canExpress) {
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
                
                // Se telefone não validado
                if (!phoneValidated) {
                  if (codeSent) {
                    submitPhoneVerification(e)
                  } else {
                    requestPhoneVerification(e)
                  }
                  return
                }
                
                // Se telefone validado, verificar créditos e manifestar interesse
                handleManifestInterest(e)
              }} 
              className="space-y-4"
            >
              {!phoneValidated && !codeSent && (
                <>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <div className="flex gap-2 items-end">
                      <div className="flex-shrink-0">
                        <select
                          id="country"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          disabled={phoneValidationLoading}
                          className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                        >
                          {COUNTRIES.map((country) => (
                            <option key={`${country.code}-${country.name}`} value={country.code}>
                              {country.flag} {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="98127-3461"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
                        disabled={phoneValidationLoading}
                        className="text-base flex-1"
                      />
                    </div>
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
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <input
                      id="professional-checkbox"
                      type="checkbox"
                      checked={isProfessionalCheckbox}
                      onChange={(e) => setIsProfessionalCheckbox(e.target.checked)}
                      className="w-4 h-4 rounded"
                      disabled={phoneValidationLoading}
                    />
                    <Label htmlFor="professional-checkbox" className="cursor-pointer mb-0">
                      Sou profissional
                    </Label>
                  </div>
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
                      Código enviado para {phoneInput} via WhatsApp
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

                  {isProfessional && !canExpress && (
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
                  (!phoneValidated && phoneInput.length === 0) ||
                  (phoneValidated && isProfessional && !canExpress)
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
          </DialogContent>
        </Dialog>
      )}

      <UpgradePlansModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  )
}
