"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export async function sendMagicLink(email: string, pendingRef?: string): Promise<string | null> {
  const trimmed = email.trim()
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "E-mail inválido"
  }

  try {
    const supabase = createSupabaseBrowserClient()
    const redirectUrl = new URL("/auth/callback", window.location.origin)
    // Keeps a "?" in {{ .RedirectTo }} so the email template can append "&token_hash=...".
    redirectUrl.searchParams.set("via", "email")
    if (pendingRef) redirectUrl.searchParams.set("pending", pendingRef)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: redirectUrl.toString(),
      },
    })
    return error ? error.message : null
  } catch (err) {
    console.error("[v0] Erro magic link:", err)
    return "Erro ao enviar link de login"
  }
}

export function GoogleLoginButton({
  disabled,
  onError,
  onLoadingChange,
}: {
  disabled?: boolean
  onError: (message: string) => void
  onLoadingChange: (loading: boolean) => void
}) {
  // Google only accepts its native button on origins registered in Google Cloud;
  // previews and other hosts keep the Supabase redirect flow.
  const [useNativeGoogleButton, setUseNativeGoogleButton] = useState(false)

  useEffect(() => {
    const host = window.location.hostname
    setUseNativeGoogleButton(host === "freejob.services" || host.endsWith(".freejob.services"))
  }, [])

  const handleGoogleLogin = async () => {
    onLoadingChange(true)
    onError("")

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      })

      if (signInError) {
        console.error("[v0] Erro Google OAuth:", signInError)
        onError(signInError.message)
      }
    } catch (err) {
      console.error("[v0] Erro ao fazer login com Google:", err)
      onError("Erro ao fazer login com Google")
    } finally {
      onLoadingChange(false)
    }
  }

  if (useNativeGoogleButton) {
    return <GoogleSignInButton onError={onError} onLoadingChange={onLoadingChange} />
  }

  return (
    <Button
      type="button"
      onClick={handleGoogleLogin}
      disabled={disabled}
      className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
    >
      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Entrar com Google
    </Button>
  )
}

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const sendError = await sendMagicLink(email)
    if (sendError) {
      setError(sendError)
    } else {
      setSuccess(`Link de login enviado para ${email.trim()}. Verifique sua caixa de entrada.`)
      setEmail("")
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4">
          <GoogleLoginButton disabled={loading} onError={setError} onLoadingChange={setLoading} />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Magic Link Section */}
          <form onSubmit={handleMagicLink} className="grid gap-3">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || !email}
            >
              {loading ? "Enviando..." : "Enviar Link de Login"}
            </Button>
          </form>

          <p className="text-center text-xs leading-relaxed text-gray-500">
            Ao continuar, você concorda com os{" "}
            <Link href="/termos" className="text-blue-600 underline underline-offset-2">
              Termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="text-blue-600 underline underline-offset-2">
              Política de privacidade
            </Link>
            .
          </p>

          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              {success}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
