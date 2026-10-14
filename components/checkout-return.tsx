"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { resumeAfterCheckout } from "@/lib/checkout-resume"

interface CheckoutReturnProps {
  sessionId: string
  needId: string | null
}

export function CheckoutReturn({ sessionId, needId }: CheckoutReturnProps) {
  const router = useRouter()
  const { toast } = useToast()

  const { data, isLoading, mutate, isValidating } = useSWR(
    ["checkout-resume", sessionId, needId],
    () => resumeAfterCheckout(sessionId, needId),
    { revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false, shouldRetryOnError: false },
  )

  useEffect(() => {
    if (!data) return

    if (data.status === "interest_done") {
      toast({
        title: "Plano ativado e interesse manifestado!",
        description: "Seu interesse foi registrado e o chat com o cliente foi iniciado.",
        variant: "success",
      })
      router.replace(`/?needId=${encodeURIComponent(data.needId)}`)
      return
    }

    if (data.status === "plan_active" && data.needId) {
      toast({
        title: "Plano ativado!",
        description: data.reason
          ? `Não foi possível concluir o interesse: ${data.reason}`
          : "Seu plano está ativo. Conclua seu interesse no pedido.",
        variant: data.reason ? "destructive" : "success",
      })
      router.replace(`/?needId=${encodeURIComponent(data.needId)}`)
    }
  }, [data, router, toast])

  const isWorking = isLoading || isValidating || data?.status === "interest_done" || (data?.status === "plan_active" && Boolean(data.needId))

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8 flex flex-col items-center gap-4 text-center">
        {isWorking && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-balance">Confirmando seu pagamento</h1>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty" role="status">
              {needId
                ? "Estamos ativando seu plano e concluindo sua manifestação de interesse."
                : "Estamos ativando seu plano."}
            </p>
          </>
        )}

        {!isWorking && data?.status === "plan_active" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-balance">Plano ativado!</h1>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
              Sua assinatura está ativa. Agora você pode manifestar interesse sem limite de quantidade.
            </p>
            <Button className="w-full" onClick={() => router.replace("/")}>
              Ver serviços disponíveis
            </Button>
          </>
        )}

        {!isWorking && data?.status === "error" && (
          <>
            <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-balance">Não foi possível confirmar</h1>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty" role="alert">
              {data.reason}
            </p>
            <div className="flex w-full flex-col gap-2">
              <Button className="w-full" onClick={() => mutate()}>
                Tentar novamente
              </Button>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => router.replace(needId ? `/?needId=${encodeURIComponent(needId)}` : "/")}
              >
                {needId ? "Voltar ao pedido" : "Voltar ao início"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </main>
  )
}
