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
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const { toast } = useToast()

  // Limpar estado ao abrir/fechar
  const handleClose = () => {
    if (!loading) {
      setVerificationCode("")
      setError("")
      setCodeSent(false)
      onClose()
    }
  }

  // Solicitar código de verificação ao abrir o modal
  const requestVerificationCode = async () => {
    setLoading(true)
    setError("")
    setCodeSent(false)

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, "")

      console.log("[v0] Modal - Phone recebido:", phoneNumber)
      console.log("[v0] Modal - Phone limpo:", cleanPhone)
      console.log("[v0] Modal - Comprimento:", cleanPhone.length)

      const response = await fetch("/api/phone/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: cleanPhone,
          email: currentUserEmail 
        }),
      })

      console.log("[v0] Modal - Resposta status:", response.status)

      if (!response.ok) {
        const text = await response.text()
        console.log("[v0] Modal - Erro response:", text)
        try {
          const data = JSON.parse(text)
          throw new Error(data.message || "Erro ao enviar código de verificação")
        } catch (parseErr) {
          throw new Error(`Erro do servidor (${response.status}): Tente novamente`)
        }
      }

      console.log("[v0] Modal - Código enviado com sucesso")
      setCodeSent(true)
      toast({
        title: "Código enviado",
        description: "Verifique seu SMS para o código de verificação.",
      })
    } catch (err: any) {
      console.error("[v0] Modal - Erro:", err)
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

      console.log("[v0] Verify - Phone:", cleanPhone)
      console.log("[v0] Verify - Code:", verificationCode)

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
        const text = await response.text()
        console.log("[v0] Verify - Erro response:", text)
        try {
          const data = JSON.parse(text)
          throw new Error(data.message || "Código inválido")
        } catch (parseErr) {
          throw new Error(`Erro do servidor (${response.status}): Tente novamente`)
        }
      }

      console.log("[v0] Verify - Sucesso!")
      toast({
        title: "Sucesso!",
        description: "Telefone validado com sucesso.",
        variant: "success",
      })

      onSuccess(cleanPhone)
      handleClose()
    } catch (err: any) {
      console.error("[v0] Verify - Erro:", err)
      setError(err.message || "Erro ao validar telefone")
    } finally {
      setLoading(false)
    }
  }

  // Solicitar código ao abrir o modal
  useEffect(() => {
    if (isOpen && !error && !codeSent) {
      requestVerificationCode()
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Validar Telefone</DialogTitle>
          <DialogDescription>
            {codeSent 
              ? `Informe o código de 6 dígitos enviado por SMS para ${phoneNumber}`
              : "Enviando código de verificação..."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {!codeSent && !error && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <p className="ml-2 text-sm text-muted-foreground">Enviando código de verificação...</p>
          </div>
        )}

        {codeSent && (
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
                className="text-center text-2xl tracking-widest font-mono"
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
        )}
      </DialogContent>
    </Dialog>
  )
}
