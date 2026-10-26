"use client"

import { useState } from "react"
import useSWR from "swr"
import { Globe, MapPin, RotateCcw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  getPendingReconfirmations,
  respondToReconfirmation,
  type PendingReconfirmation,
} from "@/lib/interest-reconfirm"

export function InterestReconfirmDialog({ email }: { email: string }) {
  const { toast } = useToast()
  const [pending, setPending] = useState<"keep" | "drop" | null>(null)
  const { data, mutate } = useSWR<PendingReconfirmation[]>(
    ["interest-reconfirm", email],
    () => getPendingReconfirmations(),
    { refreshInterval: 60_000, revalidateOnFocus: true },
  )

  const current = data?.[0]
  const remaining = (data?.length ?? 0) - 1

  async function respond(keep: boolean) {
    if (!current || pending) return
    setPending(keep ? "keep" : "drop")
    try {
      await respondToReconfirmation({ needId: current.needId, keep })
      toast({
        title: keep ? "Interesse mantido" : "Interesse retirado",
        description: keep
          ? "O solicitante continua vendo seu interesse neste pedido."
          : "Esse pedido não ocupa mais uma vaga de serviço simultâneo.",
      })
      await mutate((list) => list?.filter((item) => item.needId !== current.needId), { revalidate: true })
    } catch (error) {
      toast({
        title: "Não foi possível responder",
        description: error instanceof Error ? error.message.replace(/^Error:\s*/, "") : "Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setPending(null)
    }
  }

  return (
    <Dialog open={Boolean(current)}>
      {current && (
        <DialogContent
          className="max-w-md gap-5 [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="gap-2 text-left">
            <span className="flex w-fit items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Disponível novamente
            </span>
            <DialogTitle className="text-xl text-balance">Você ainda tem interesse neste serviço?</DialogTitle>
            <DialogDescription className="leading-relaxed text-pretty">
              O profissional escolhido cancelou e o pedido voltou a ficar aberto. Enquanto você não responder,
              ele não ocupa uma vaga de serviço simultâneo.
            </DialogDescription>
          </DialogHeader>

          <article className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4">
            {current.image && (
              <img
                src={current.image || "/placeholder.svg"}
                alt=""
                className="h-36 w-full rounded-lg object-cover"
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              {current.category && <Badge variant="secondary">{current.category}</Badge>}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {current.isRemote ? (
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {current.location || "Local não informado"}
              </span>
            </div>
            <h3 className="font-semibold leading-snug text-foreground text-pretty">{current.title}</h3>
            {current.description && (
              <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">{current.description}</p>
            )}
          </article>

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button
              className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700"
              disabled={pending !== null}
              onClick={() => respond(true)}
            >
              {pending === "keep" ? "Confirmando..." : "Sim, manter meu interesse"}
            </Button>
            <Button
              variant="ghost"
              className="h-11 w-full"
              disabled={pending !== null}
              onClick={() => respond(false)}
            >
              {pending === "drop" ? "Retirando..." : "Não tenho mais interesse"}
            </Button>
            {remaining > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {remaining === 1 ? "Mais 1 pedido aguarda" : `Mais ${remaining} pedidos aguardam`} sua resposta.
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
