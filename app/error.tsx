"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { StatusScreen } from "@/components/status-screen"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app] Unhandled error:", error)
  }, [error])

  return (
    <StatusScreen
      code={error.digest ? `ERRO ${error.digest}` : "ERRO"}
      title="Algo deu errado"
      description="Não conseguimos carregar esta página agora. Tente de novo em alguns segundos."
    >
      <Button onClick={reset}>Tentar novamente</Button>
      <Button asChild variant="outline">
        <Link href="/">Voltar para o início</Link>
      </Button>
    </StatusScreen>
  )
}
