"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

type AuthStep = "phone" | "verification" | "registration"

interface PhoneAuthFormProps {
  onSuccess?: () => void
}

export function PhoneAuthForm({ onSuccess }: PhoneAuthFormProps) {
  const [step, setStep] = useState<AuthStep>("phone")
  const [phone, setPhone] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [userExists, setUserExists] = useState(false)

  // Dados para novo usuário
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [userType, setUserType] = useState<"service" | "professional" | "both">("both")

  const router = useRouter()

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 2) return cleaned
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 12)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const cleanPhone = phone.replace(/\D/g, "")
      if (cleanPhone.length < 11 || cleanPhone.length > 12) {
        setError("Telefone deve ter entre 11 e 12 dígitos (com DDD)")
        return
      }

      // Verificar se usuário existe
      const response = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      })

      const data = await response.json()

      if (response.ok) {
        setUserExists(data.exists)
        // Enviar código de verificação via SMS
        const otpResponse = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhone }),
        })

        const otpData = await otpResponse.json()

        if (otpResponse.ok) {
          console.log("[v0] Código enviado com sucesso")
          setStep("verification")
        } else {
          console.error("[v0] Erro ao enviar OTP:", otpData)
          setError(otpData.error || "Erro ao enviar código de verificação")
        }
      } else {
        setError(data.error || "Erro ao verificar telefone")
      }
    } catch (err: any) {
      setError(err.message || "Erro ao processar telefone")
    } finally {
      setLoading(false)
    }
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const cleanPhone = phone.replace(/\D/g, "")

      // Verificar código OTP
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, code: verificationCode }),
      })

      const data = await response.json()

      console.log("[v0] Resposta verify-otp:", data)

      if (response.ok) {
        // Usar a resposta de verify-otp para decidir o fluxo
        if (data.userExists) {
          console.log("[v0] Usuário existe, fazendo login")
          // Usuário existe, fazer login
          router.push("/dashboard")
          onSuccess?.()
        } else {
          console.log("[v0] Novo usuário, ir para registro")
          // Novo usuário, ir para registro
          setStep("registration")
        }
      } else {
        setError(data.error || "Código inválido")
      }
    } catch (err: any) {
      console.error("[v0] Erro ao verificar:", err)
      setError(err.message || "Erro ao verificar código")
    } finally {
      setLoading(false)
    }
  }

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        setError("Todos os campos são obrigatórios")
        return
      }

      const cleanPhone = phone.replace(/\D/g, "")

      const response = await fetch("/api/auth/register-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          firstName,
          lastName,
          email,
          userType,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/dashboard")
        onSuccess?.()
      } else {
        setError(data.error || "Erro ao registrar usuário")
      }
    } catch (err: any) {
      setError(err.message || "Erro ao registrar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      {step === "phone" && (
        <>
          <CardHeader>
            <CardTitle>Bem-vindo</CardTitle>
            <CardDescription>Digite seu número de telefone para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={handlePhoneChange}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || !phone}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Avançar...
                  </>
                ) : (
                  "Avançar"
                )}
              </Button>
            </form>
          </CardContent>
        </>
      )}

      {step === "verification" && (
        <>
          <CardHeader>
            <CardTitle>Verificação</CardTitle>
            <CardDescription>Digite o código enviado para {phone}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de Verificação</Label>
                <Input
                  id="code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || verificationCode.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStep("phone")
                  setVerificationCode("")
                  setError("")
                }}
              >
                Voltar
              </Button>
            </form>
          </CardContent>
        </>
      )}

      {step === "registration" && (
        <>
          <CardHeader>
            <CardTitle>Complete seu cadastro</CardTitle>
            <CardDescription>Alguns dados adicionais para finalizar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegistrationSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  placeholder="João"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  placeholder="Silva"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-3">
                <Label>Qual é seu interesse?</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="userType"
                      value="service"
                      checked={userType === "service"}
                      onChange={(e) => setUserType(e.target.value as any)}
                    />
                    <span className="text-sm">Solicitar serviço</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="userType"
                      value="professional"
                      checked={userType === "professional"}
                      onChange={(e) => setUserType(e.target.value as any)}
                    />
                    <span className="text-sm">Procurar profissional</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="userType"
                      value="both"
                      checked={userType === "both"}
                      onChange={(e) => setUserType(e.target.value as any)}
                    />
                    <span className="text-sm">Ambos</span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Concluir Cadastro"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStep("verification")
                  setFirstName("")
                  setLastName("")
                  setEmail("")
                  setError("")
                }}
              >
                Voltar
              </Button>
            </form>
          </CardContent>
        </>
      )}
    </Card>
  )
}
