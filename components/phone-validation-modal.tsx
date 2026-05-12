"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type ValidationStep = "verification"

interface PhoneValidationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (phone: string) => void
  currentUserEmail: string
  phoneNumber: string
}

export function PhoneValidationModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserEmail,
  phoneNumber,
}: PhoneValidationModalProps) {
  const [step, setStep] = useState<ValidationStep>("verification")
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  // Limpar estado ao abrir/fechar
  const handleClose = () => {
    setVerificationCode("")
    setError("")
    setStep("verification")
    onClose()
  }

  // Solicitar código de verificação ao abrir o modal
  const requestVerificationCode = async () => {
    setLoading(true)
    setError("")

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, "")

      console.log("[v0] Enviando telefone para validação:", cleanPhone)

      const response = await fetch("/api/phone/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: cleanPhone,
          email: currentUserEmail 
        }),
      })

      console.log("[v0] Resposta status:", response.status)

      if (!response.ok) {
        const text = await response.text()
        console.log("[v0] Erro response:", text)
        try {
          const data = JSON.parse(text)
          throw new Error(data.message || "Erro ao enviar código de verificação")
        } catch (parseErr) {
          throw new Error(`Erro do servidor (${response.status}): Tente novamente`)
        }
      }

      console.log("[v0] Sucesso ao enviar código")
      toast({
        title: "Código enviado",
        description: "Verifique seu SMS para o código de verificação.",
      })
    } catch (err: any) {
      console.error("[v0] Erro:", err)
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
        setLoading(false)
        return
      }

      const cleanPhone = phoneNumber.replace(/\D/g, "")

      console.log("[v0] Verificando código para telefone:", cleanPhone)

      const response = await fetch("/api/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          code: verificationCode,
          email: currentUserEmail,
        }),
      })

      console.log("[v0] Resposta verify status:", response.status)

      if (!response.ok) {
        const text = await response.text()
        console.log("[v0] Erro verify response:", text)
        try {
          const data = JSON.parse(text)
          throw new Error(data.message || "Código inválido")
        } catch (parseErr) {
          throw new Error(`Erro do servidor (${response.status}): Tente novamente`)
        }
      }

      console.log("[v0] Telefone validado com sucesso")

      toast({
        title: "Sucesso!",
        description: "Telefone validado com sucesso.",
        variant: "success",
      })

      onSuccess(cleanPhone)
      handleClose()
    } catch (err: any) {
      console.error("[v0] Erro na verificação:", err)
      setError(err.message || "Erro ao validar telefone")
    } finally {
      setLoading(false)
    }
  }

  // Solicitar código ao abrir o modal
  useEffect(() => {
    if (isOpen && !error) {
      requestVerificationCode()
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Validar Telefone</DialogTitle>
          <DialogDescription>
            Informe o código de 6 dígitos enviado por SMS para {phoneNumber}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

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
          <Button type="submit" disabled={loading || verificationCode.length !== 6} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
