"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      console.log("[v0] App instalado com sucesso")
      setIsInstallable(false)
    }

    setDeferredPrompt(null)
  }

  if (!isInstallable) return null

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative bg-transparent"
      onClick={handleInstallClick}
      title="Instalar App"
    >
      <Download className="h-5 w-5" />
    </Button>
  )
}

export default InstallAppButton
