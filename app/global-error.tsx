"use client"

import "./globals.css"
import { StatusScreen } from "@/components/status-screen"
import { Button } from "@/components/ui/button"

// Replaces the root layout when it crashes, so it must render its own <html>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className="font-sans antialiased">
        <StatusScreen
          code="ERRO"
          title="O Freejob está com instabilidade"
          description="Algo inesperado aconteceu. Tente novamente em instantes."
        >
          <Button onClick={reset}>Tentar novamente</Button>
        </StatusScreen>
      </body>
    </html>
  )
}
