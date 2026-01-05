"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function ClearCookiesPage() {
  const router = useRouter()
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    // Limpar todos os cookies do Supabase
    const cookies = document.cookie.split(";")

    for (const cookie of cookies) {
      const name = cookie.split("=")[0].trim()

      // Remover cookies do Supabase
      if (name.includes("supabase") || name.includes("sb-")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
      }
    }

    setCleared(true)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">{cleared ? "Cookies Limpos!" : "Limpando Cookies..."}</h1>
        <p className="text-muted-foreground">
          {cleared
            ? "Os cookies corrompidos foram removidos. Você pode voltar para a página inicial."
            : "Aguarde enquanto limpamos os cookies corrompidos..."}
        </p>
        {cleared && <Button onClick={() => router.push("/")}>Voltar para Início</Button>}
      </div>
    </div>
  )
}
