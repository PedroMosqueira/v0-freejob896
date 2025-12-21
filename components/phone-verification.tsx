"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendPhoneVerificationCode, verifyPhoneCode, type UserProfile } from "@/lib/user-profile"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, Phone, Loader2 } from "lucide-react"

interface PhoneVerificationProps {
  profile: UserProfile
}

function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, "").replace(/^55/, "")

  if (cleaned.length === 0) return ""
  if (cleaned.length <= 2) return `(${cleaned}`
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
  if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
}

function unformatPhoneNumber(value: string): string {
  return value.replace(/\D/g, "").replace(/^55/, "+55")
}

export function PhoneVerification({ profile }: PhoneVerificationProps) {
  const [showVerificationInput, setShowVerificationInput] = useState(false)
  const [phone, setPhone] = useState(profile.phone || "")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhone(formatted)
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData()
      const cleanPhone = "+55" + phone.replace(/\D/g, "")
      formData.append("phone", cleanPhone)

      const result = await sendPhoneVerificationCode(null, formData)

      if (result?.success) {
        toast({
          title: "Código enviado!",
          description: result.message,
        })
        setShowVerificationInput(true)
      } else {
        toast({
          title: "Erro",
          description: result?.message || "Erro ao enviar código",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar código",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await verifyPhoneCode(null, new FormData(e.target as HTMLFormElement))

      if (result?.success) {
        toast({
          title: "Sucesso!",
          description: result.message,
        })
        setShowVerificationInput(false)
        window.location.reload()
      } else {
        toast({
          title: "Erro",
          description: result?.message || "Código inválido",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao verificar código",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (profile.phoneVerified) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="font-semibold">Telefone Verificado</h3>
            <p className="text-sm text-muted-foreground">{profile.phone}</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Verificar Telefone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Verifique seu telefone para aumentar a confiança do seu perfil
          </p>

          {!showVerificationInput ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Número de Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">Digite seu número com DDD. Ex: (51) 99999-9999</p>
              </div>
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Código de Verificação"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de Verificação</Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">Digite o código de 6 dígitos recebido por SMS</p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Verificar Código"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVerificationInput(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Card>
  )
}
