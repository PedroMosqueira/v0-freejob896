"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react"

interface DiagnosisResult {
  success: boolean
  message: string
  diagnosis?: string
  error?: string
  code?: string
}

export default function EmailDiagnosticsPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosisResult | null>(null)

  async function handleTest() {
    if (!email || !email.includes("@")) {
      setResult({ success: false, message: "Email inválido" })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/auth/test-email-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: "Erro ao conectar com servidor",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="container mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold">Diagnóstico de Email</h1>
          <p className="text-lg text-gray-600">
            Teste se o sistema de email está funcionando corretamente
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Teste de Envio de Email
            </CardTitle>
            <CardDescription>
              Envie um email de teste para verificar se o provedor SMTP está configurado corretamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email para teste:
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button onClick={handleTest} disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Email de Teste
                </>
              )}
            </Button>

            {/* Results */}
            {result && (
              <div className="space-y-4">
                <Alert variant={result.success ? "default" : "destructive"}>
                  <div className="flex gap-3">
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <AlertDescription className="font-medium">{result.message}</AlertDescription>
                    </div>
                  </div>
                </Alert>

                {/* Diagnosis */}
                {result.diagnosis && (
                  <Alert>
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription>
                      <strong>Diagnóstico:</strong> {result.diagnosis}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error Details */}
                {result.error && !result.success && (
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-6">
                      <div className="space-y-2 text-sm">
                        <p>
                          <strong>Detalhes do erro:</strong>
                        </p>
                        <p className="text-red-800">{result.error}</p>
                        {result.code && (
                          <p className="text-red-700">
                            <strong>Código:</strong> {result.code}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              O que fazer se o email não chegou?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-1">1️⃣ Verifique a pasta de SPAM</h4>
                <p className="text-sm text-gray-600">
                  Os emails de teste frequentemente vão para a pasta de spam. Verifique lá primeiro.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">2️⃣ Aguarde alguns minutos</h4>
                <p className="text-sm text-gray-600">
                  Emails podem demorar até 5 minutos para chegar. Se não chegou, tente novamente.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">3️⃣ Verifique o Rate Limit</h4>
                <p className="text-sm text-gray-600">
                  Se receber erro "rate limit", você atingiu o limite de emails por hora/dia. Aguarde um pouco
                  antes de tentar novamente.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-1">4️⃣ Verifique a Configuração SMTP</h4>
                <p className="text-sm text-gray-600">
                  No Supabase Dashboard, vá para: Authentication → Email Templates → SMTP Settings
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Certifique-se de que:
                </p>
                <ul className="text-sm text-gray-600 ml-4 mt-1 space-y-1 list-disc">
                  <li>Host: smtp.resend.com</li>
                  <li>Port: 465</li>
                  <li>Username: resend</li>
                  <li>Password: sua API Key do Resend</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links Úteis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a
                href="https://resend.com/logs"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-700 text-sm"
              >
                → Ver logs do Resend
              </a>
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-700 text-sm"
              >
                → Gerenciar API Keys do Resend
              </a>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-700 text-sm"
              >
                → Acessar Supabase Dashboard
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
