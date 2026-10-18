import Link from "next/link"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { StatusScreen } from "@/components/status-screen"

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false },
}

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="Página não encontrada"
      description="O endereço pode ter sido digitado errado ou a página não existe mais."
    >
      <Button asChild>
        <Link href="/">Voltar para o início</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/planos">Ver planos</Link>
      </Button>
    </StatusScreen>
  )
}
