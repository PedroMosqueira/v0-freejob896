"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function CallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Processando...")

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log("[v0] 🔄 Processing Supabase callback on client side")

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
          console.log("[v0] ✅ Recovery token found, redirecting to reset password")
          setStatus("success")
          setMessage("Redirecionando para redefinição de senha...")

          // Pass tokens in URL for reset page to handle
          const params = new URLSearchParams({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          })

          setTimeout(() => {
            router.push(`/auth/reset-password?${params.toString()}`)
          }, 1000)
        } else {
          // Check for query params (regular OAuth flow)
          const queryParams = new URLSearchParams(window.location.search)
          const code = queryParams.get("code")

          if (code) {
            console.log("[v0] 🔄 Processing OAuth code")
            setMessage("Verificando código de autenticação...")

            // Let server-side callback handle OAuth code
            window.location.href = `/api/auth/callback?${queryParams.toString()}`
          } else {
            console.log("[v0] ⚠️ No valid parameters found")
            setStatus("error")
            setMessage("Link inválido ou expirado")
            setTimeout(() => router.push("/"), 3000)
          }
        }
      } catch (error) {
        console.error("[v0] ❌ Callback error:", error)
        setStatus("error")
        setMessage("Erro ao processar link de recuperação")
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
