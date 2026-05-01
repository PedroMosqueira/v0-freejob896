"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

export function AuthForm() {
  const router = useRouter()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  )
  
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showEmailInput, setShowEmailInput] = useState(false)



  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (!email || !email.includes("@")) {
        setError("Email inválido")
        setLoading(false)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signInError) {
        setError(signInError.message)
      } else {
        setSuccess(`Link de login enviado para ${email}. Verifique sua caixa de entrada.`)
        setEmail("")
      }
    } catch (err: any) {
      console.error("[v0] Erro magic link:", err)
      setError("Erro ao enviar link de login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4">
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
