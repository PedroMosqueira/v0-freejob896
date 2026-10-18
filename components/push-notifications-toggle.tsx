"use client"

import { BellOff, BellRing, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { openInstallDialog } from "@/lib/pwa"

export function PushNotificationsToggle({ enabled }: { enabled: boolean }) {
  const { status, busy, enable, disable } = usePushNotifications(enabled)

  if (status === "loading" || status === "unsupported") return null

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
      {status === "on" ? (
        <BellRing className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
      ) : status === "needs-install" ? (
        <Smartphone className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
      ) : (
        <BellOff className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
      )}

      <p className="min-w-0 flex-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
        {status === "on" && "Avisos no celular ativados neste aparelho."}
        {status === "off" && "Receba avisos no celular mesmo com o app fechado."}
        {status === "denied" && "Notificações bloqueadas. Libere nas configurações do navegador."}
        {status === "needs-install" && "No iPhone, instale o app para receber avisos."}
      </p>

      {status === "off" && (
        <Button size="sm" className="h-8 bg-blue-600 text-white hover:bg-blue-700" onClick={enable} disabled={busy}>
          {busy ? "Ativando..." : "Ativar"}
        </Button>
      )}
      {status === "on" && (
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={disable} disabled={busy}>
          Desativar
        </Button>
      )}
      {status === "needs-install" && (
        <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={openInstallDialog}>
          Instalar
        </Button>
      )}
    </div>
  )
}
