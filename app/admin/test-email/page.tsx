"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, CheckCircle2, XCircle } from "lucide-react"

export default function TestEmailPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleTest() {
    if (!email || !email.includes("@")) {
      setResult({ success: false, message: "Email inválido" })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      setResult({ success: data.success, message: data.message || data.error || "Erro desconhecido" })
    } catch (error) {
      setResult({ success: false, message: "Erro ao conectar com servidor" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Testador de Email - Recuperação de Senha
          </CardTitle>
          <CardDescription>
            Use esta ferramenta para testar se os emails de recuperação de senha estão sendo enviados corretamente
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
              placeholder="usuario@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button onClick={handleTest} disabled={loading} className="w-full">
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

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-sm">Instruções de Configuração</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Se os emails não estão chegando, você precisa configurar um provedor SMTP no Supabase:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Acesse o Supabase Dashboard</li>
                <li>Vá para Authentication → Email Templates</li>
                <li>Role até "SMTP Settings"</li>
                <li>Configure um provedor (Resend, Gmail, SendGrid)</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-4">
                Consulte o arquivo <code>CONFIGURAR_SMTP_SUPABASE.md</code> para instruções detalhadas
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
