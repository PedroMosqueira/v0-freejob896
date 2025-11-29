"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, Mail } from "lucide-react"

interface ForgotPasswordFormProps {
  onBack: () => void
}

export default function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [resetUrl, setResetUrl] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    const trimmedEmail = email.trim()

    console.log("[v0] Attempting to send reset email for:", trimmedEmail)

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Por favor, insira um email válido.")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      })

      console.log("[v0] Response status:", response.status)

      const data = await response.json()
      console.log("[v0] Response data:", JSON.stringify(data, null, 2))

      if (data.success) {
        console.log("[v0] ✅ SUCCESS!")

        if (data.resetUrl) {
          console.log("[v0] Reset URL:", data.resetUrl)
          setResetUrl(data.resetUrl)
        }
        setSuccess(true)
      } else {
        const errorMsg = data.message || "Erro ao solicitar recuperação de senha."
        console.error("[v0] Error from API:", errorMsg)
        setError(errorMsg)
      }
    } catch (err) {
      console.error("[v0] Fetch error:", err)
      setError("Erro ao processar solicitação. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Email Enviado!</h2>
            <p className="text-sm text-muted-foreground">
              Um link de recuperação foi enviado para <strong>{email}</strong>.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800">
                <strong>Verifique sua caixa de entrada e spam.</strong>
              </p>
              <p className="text-xs text-blue-700 mt-2">O link expira em 1 hora por segurança.</p>
            </div>

            <div className="space-y-2">
              <Button onClick={onBack} className="w-full bg-blue-600 hover:bg-blue-600/90">
                Voltar ao Login
              </Button>
              <Button
                onClick={() => {
                  setSuccess(false)
                  setEmail("")
                  setResetUrl("")
                }}
                variant="outline"
                className="w-full"
              >
                Tentar outro email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="pt-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">Esqueceu a Senha?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Digite seu email e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-600/90" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Link de Recuperação"
            )}
          </Button>

          <Button
            type="button"
            variant="link"
            className="w-full text-sm text-blue-600"
            onClick={onBack}
            disabled={isSubmitting}
          >
            Voltar ao Login
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
