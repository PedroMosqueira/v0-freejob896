"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

const checkPasswordStrength = (password: string) => {
  let score = 0
  if (!password) return { score: 0, text: "Nenhuma senha" }
  if (password.length >= 8) score += 20
  if (password.length >= 12) score += 20
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/\d/.test(password)) score += 10
  if (/[^a-zA-Z0-9]/.test(password)) score += 20
  let text = "Muito Fraca"
  if (score >= 80) text = "Muito Forte"
  else if (score >= 60) text = "Forte"
  else if (score >= 40) text = "Média"
  else if (score >= 20) text = "Fraca"
  return { score: Math.min(score, 100), text }
}

export default function UpdatePasswordForm() {
  const { email } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

  const passwordStrength = checkPasswordStrength(newPassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Sucesso!",
          description: result.message,
          variant: "success",
        })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmNewPassword("")
      } else {
        toast({
          title: "Erro ao atualizar senha",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Password update error:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Alterar Senha</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password">Senha Atual</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <div className="mt-1">
              <Progress value={passwordStrength.score} className="h-2" />
              <p
                className="text-sm mt-1"
                style={{
                  color: passwordStrength.score < 40 ? "red" : passwordStrength.score < 70 ? "orange" : "green",
                }}
              >
                Força: {passwordStrength.text}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Use letras maiúsculas, minúsculas, números e símbolos para uma senha forte.
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-600/90" disabled={isLoading}>
            {isLoading ? "Atualizando..." : "Atualizar Senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
