"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type ValidationStep = "phone" | "verification"

interface PhoneValidationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (phone: string) => void
  currentUserEmail: string
}

export function PhoneValidationModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserEmail,
}: PhoneValidationModalProps) {
  const [step, setStep] = useState<ValidationStep>("phone")
  const [phone, setPhone] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 2) return cleaned
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
    setError("")
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const cleanPhone = phone.replace(/\D/g, "")
      if (cleanPhone.length !== 11) {
        setError("Telefone deve ter 11 dígitos (com DDD)")
        return
      }

      // Solicitar código de verificação
      const response = await fetch("/api/phone/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: cleanPhone,
          email: currentUserEmail 
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Erro ao enviar código de verificação")
      }

      setStep("verification")
      toast({
        title: "Código enviado",
        description: "Verifique seu SMS para o código de verificação.",
      })
    } catch (err: any) {
      setError(err.message || "Erro ao solicitar verificação")
    } finally {
      setLoading(false)
    }
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!verificationCode || verificationCode.length !== 6) {
        setError("Código deve ter 6 dígitos")
        return
      }

      const cleanPhone = phone.replace(/\D/g, "")

      // Verificar código e salvar telefone
      const response = await fetch("/api/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          code: verificationCode,
          email: currentUserEmail,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Código inválido")
      }

      toast({
        title: "Sucesso!",
        description: "Telefone validado com sucesso.",
        variant: "success",
      })

      onSuccess(cleanPhone)
      onClose()
      setPhone("")
      setVerificationCode("")
      setStep("phone")
    } catch (err: any) {
      setError(err.message || "Erro ao validar telefone")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      setPhone("")
      setVerificationCode("")
      setStep("phone")
      setError("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Validar Telefone</DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? "Informe seu número de telefone para validação"
              : "Informe o código recebido por SMS"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Número de Telefone</Label>
              <Input
                id="phone"
                placeholder="(11) 98765-4321"
                value={phone}
                onChange={handlePhoneChange}
                disabled={loading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Digite seu telefone com DDD (11 dígitos)</p>
            </div>
            <Button type="submit" disabled={loading || phone.replace(/\D/g, "").length !== 11}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando código...
                </>
              ) : (
                "Enviar Código"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerificationSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Código de Verificação</Label>
              <Input
                id="code"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  setError("")
                }}
                disabled={loading}
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Digite o código de 6 dígitos recebido por SMS</p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("phone")
                  setVerificationCode("")
                }}
                disabled={loading}
              >
                Voltar
              </Button>
              <Button type="submit" disabled={loading || verificationCode.length !== 6} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
