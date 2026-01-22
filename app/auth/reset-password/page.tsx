"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import Image from "next/image"
import { createBrowserClient } from "@supabase/ssr"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const checkSession = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      console.log("[v0] Reset Password - Session check:", {
        hasSession: !!session,
        email: session?.user?.email,
        error: sessionError?.message,
      })

      if (sessionError || !session) {
        console.error("[v0] No valid session found:", sessionError)
        setError("Link de recuperação inválido ou expirado. Por favor, solicite um novo link.")
        setIsLoading(false)

        setTimeout(() => {
          router.push("/?message=Link de recuperação expirado. Solicite um novo link.")
        }, 3000)
        return
      }

      setUserEmail(session.user.email || "")
      setIsLoading(false)
    }

    checkSession()
  }, [router])

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

  const passwordStrength = checkPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.")
      setIsSubmitting(false)
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      setIsSubmitting(false)
      return
    }

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        console.error("[v0] Error updating password:", updateError)
        setError(updateError.message || "Erro ao redefinir senha.")
        setIsSubmitting(false)
        return
      }

      console.log("[v0] Password updated successfully")
      setSuccess(true)

      setTimeout(() => {
        router.push("/?message=Senha redefinida com sucesso! Faça login com sua nova senha.")
      }, 3000)
    } catch (err) {
      console.error("[v0] Exception updating password:", err)
      setError("Erro ao processar solicitação. Tente novamente.")
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Verificando sessão...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !userEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold">Link Inválido</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => router.push("/")} className="w-full">
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">Senha Redefinida!</h2>
              <p className="text-sm text-muted-foreground">
                Sua senha foi atualizada com sucesso. Você será redirecionado para fazer login.
              </p>
              <Progress value={100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Image src="/logo.png" alt="Freejob Logo" width={60} height={60} className="rounded-full" />
            </div>
            <h2 className="text-2xl font-bold">Redefinir Senha</h2>
            {userEmail && (
              <p className="text-sm text-muted-foreground mt-2">
                Conta: <span className="font-semibold text-foreground">{userEmail}</span>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <div className="mt-1">
                <Progress value={passwordStrength.score} className="h-2" />
                <p
                  className="text-sm mt-1"
                  style={{
                    color: passwordStrength.score < 40 ? "red" : passwordStrength.score < 60 ? "orange" : "green",
                  }}
                >
                  Força: {passwordStrength.text}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  A senha deve ter pelo menos 8 caracteres e incluir letras maiúsculas, minúsculas, números e símbolos.
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-600/90" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                "Redefinir Senha"
              )}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full text-sm text-blue-600"
              onClick={() => router.push("/")}
              disabled={isSubmitting}
            >
              Voltar ao Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
