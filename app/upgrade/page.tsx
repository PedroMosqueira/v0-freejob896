import type { Metadata } from "next"
import { UpgradePageContent } from "@/components/upgrade-page-content"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Plataforma Gratuita - Freejob",
  description: "Plataforma 100% gratuita no lançamento. Todos os recursos liberados!",
}

export default function UpgradePage() {
  return <UpgradePageContent />
}
