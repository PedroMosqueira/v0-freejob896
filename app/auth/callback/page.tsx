"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function CallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Processando...")

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log("[v0] Processing Supabase callback on client side")

        const supabase = createClient()

        // Get tokens from hash fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")

        console.log("[v0] Hash params:", {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
        })

        if (accessToken && type === "recovery") {
          console.log("[v0] Recovery token found, establishing session...")
          setStatus("success")
          setMessage("Estabelecendo sessão segura...")

          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          })

          if (sessionError) {
            console.error("[v0] Error setting session:", sessionError)
            setStatus("error")
            setMessage("Erro ao processar link de recuperação")
            setTimeout(() => router.push("/?message=Link inválido. Solicite um novo."), 3000)
            return
          }

          console.log("[v0] Session established successfully, redirecting to reset password")
          setMessage("Redirecionando para redefinição de senha...")

          setTimeout(() => {
            router.push("/auth/reset-password")
          }, 1000)
        } else {
          // Check for query params (regular OAuth flow)
          const queryParams = new URLSearchParams(window.location.search)
          const code = queryParams.get("code")

          if (code) {
            console.log("[v0] Processing OAuth code")
            setMessage("Verificando código de autenticação...")
            window.location.href = `/api/auth/callback?${queryParams.toString()}`
          } else {
            console.log("[v0] No valid parameters found")
            setStatus("error")
            setMessage("Link inválido ou expirado")
            setTimeout(() => router.push("/"), 3000)
          }
        }
      } catch (error) {
        console.error("[v0] Callback error:", error)
        setStatus("error")
        setMessage("Erro ao processar link de recuperação")
        setTimeout(() => router.push("/"), 3000)
      }
    }

    processCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 bg-card rounded-lg shadow-lg text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-lg text-green-600">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-red-500 text-5xl mb-4">✕</div>
            <p className="text-lg text-red-600">{message}</p>
            <p className="text-sm text-muted-foreground mt-2">Você será redirecionado em alguns segundos...</p>
          </>
        )}
      </div>
    </div>
  )
}
