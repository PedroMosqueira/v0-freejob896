"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { isStandalone, openInstallDialog } from "@/lib/pwa"

export function InstallAppButton() {
  const [installed, setInstalled] = useState(true)

  useEffect(() => {
    setInstalled(isStandalone())
    const onInstalled = () => setInstalled(true)
    window.addEventListener("freejob:installed", onInstalled)
    return () => window.removeEventListener("freejob:installed", onInstalled)
  }, [])

  if (installed) return null

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative bg-transparent"
      onClick={openInstallDialog}
      title="Baixar app"
    >
      <Download className="h-5 w-5" />
      <span className="sr-only">Baixar app</span>
    </Button>
  )
}

export default InstallAppButton
