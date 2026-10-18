"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Download, MoreVertical, PlusSquare, Share, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OPEN_INSTALL_EVENT, hasInstallPrompt, isIOS, isStandalone, openInstallDialog, promptInstall } from "@/lib/pwa"

const BANNER_DISMISSED_KEY = "freejob-install-banner-dismissed"

export function InstallAppDialog() {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<"ios" | "prompt" | "manual">("manual")
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    const refresh = () => setPlatform(isIOS() ? "ios" : hasInstallPrompt() ? "prompt" : "manual")
    refresh()

    const isMobile = window.matchMedia("(max-width: 767px)").matches
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === "1"
    if (isMobile && !dismissed && (isIOS() || hasInstallPrompt())) setShowBanner(true)

    const onInstallable = () => {
      refresh()
      if (isMobile && localStorage.getItem(BANNER_DISMISSED_KEY) !== "1") setShowBanner(true)
    }
    const onInstalled = () => {
      setShowBanner(false)
      setOpen(false)
    }
    const onOpen = () => {
      refresh()
      setOpen(true)
    }

    window.addEventListener("freejob:installable", onInstallable)
    window.addEventListener("freejob:installed", onInstalled)
    window.addEventListener(OPEN_INSTALL_EVENT, onOpen)
    return () => {
      window.removeEventListener("freejob:installable", onInstallable)
      window.removeEventListener("freejob:installed", onInstalled)
      window.removeEventListener(OPEN_INSTALL_EVENT, onOpen)
    }
  }, [])

  const dismissBanner = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, "1")
    setShowBanner(false)
  }

  const handleNativeInstall = async () => {
    const accepted = await promptInstall()
    if (accepted) {
      setOpen(false)
      setShowBanner(false)
    } else {
      setPlatform(isIOS() ? "ios" : "manual")
    }
  }

  return (
    <>
      {showBanner && (
        <div className="md:hidden fixed inset-x-3 bottom-20 z-40 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <Image src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Baixe o app Freejob</p>
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">Acesso rápido e avisos no celular</p>
          </div>
          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={openInstallDialog}>
            Instalar
          </Button>
          <button
            type="button"
            onClick={dismissBanner}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-center text-center">
            <Image src="/icons/icon-192.png" alt="" width={64} height={64} className="h-16 w-16 rounded-2xl" />
            <DialogTitle>Instale o Freejob no celular</DialogTitle>
            <DialogDescription className="text-pretty">
              O app fica na tela inicial, abre em tela cheia e pode avisar quando chegar proposta ou mensagem.
            </DialogDescription>
          </DialogHeader>

          {platform === "prompt" && (
            <Button className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700" onClick={handleNativeInstall}>
              <Download className="h-4 w-4" />
              Instalar agora
            </Button>
          )}

          {platform === "ios" && (
            <ol className="flex flex-col gap-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-3">
                <Share className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <span>
                  No Safari, toque em <strong>Compartilhar</strong> na barra do navegador.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <PlusSquare className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <span>
                  Escolha <strong>Adicionar à Tela de Início</strong> e toque em <strong>Adicionar</strong>.
                </span>
              </li>
              <li className="text-xs text-gray-500 dark:text-gray-400">
                {"No iPhone, as notificações só funcionam com o app instalado (iOS 16.4 ou mais recente)."}
              </li>
            </ol>
          )}

          {platform === "manual" && (
            <ol className="flex flex-col gap-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-3">
                <MoreVertical className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <span>
                  Abra o <strong>menu do navegador</strong> (os três pontos).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <PlusSquare className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <span>
                  Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
                </span>
              </li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
