"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { QRCodeSVG } from "qrcode.react"
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, QrCode, RefreshCw } from "lucide-react"
import { buildAndroidAppLink, isAndroid, isMobileDevice } from "@/lib/whatsapp-app-link"

type Status = "pending" | "received" | "confirmed" | "rejected" | "expired"

interface Attempt {
  id: string
  code: string
  link: string
}

interface StatusResponse {
  status: Status
  phone: string | null
}

interface WhatsAppVerificationPanelProps {
  isProfessional: boolean
  onVerified: (phone: string, message: string) => void
}

function VerificationQrCode({ link, code }: { link: string; code?: string }) {
  return (
    <figure className="flex flex-col items-center gap-2 rounded-lg border bg-muted/40 p-4">
      {/* QR codes need dark modules on a light background to scan reliably, even in dark mode. */}
      <div className="rounded-md bg-white p-2.5">
        <QRCodeSVG
          value={link}
          size={168}
          level="M"
          bgColor="#ffffff"
          fgColor="#0b141a"
          role="img"
          aria-label="QR code que abre o WhatsApp com a mensagem de verificação"
        />
      </div>
      <figcaption className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-xs text-muted-foreground">Não precisa estar logado no celular</span>
        {code && (
          <span className="text-xs text-muted-foreground">
            Código: <span className="font-mono font-semibold tracking-widest text-foreground">{code}</span>
          </span>
        )}
      </figcaption>
    </figure>
  )
}

const fetchStatus = async (url: string): Promise<StatusResponse> => {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("status")
  return res.json()
}

export function WhatsAppVerificationPanel({ isProfessional, onVerified }: WhatsAppVerificationPanelProps) {
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState("")
  const [onAndroid, setOnAndroid] = useState(false)
  const [onMobile, setOnMobile] = useState(true)
  const [showQrOnMobile, setShowQrOnMobile] = useState(false)
  const startedRef = useRef(false)

  const { data, mutate } = useSWR<StatusResponse>(
    attempt ? `/api/phone/whatsapp-verification/${attempt.id}` : null,
    fetchStatus,
    {
      refreshInterval: (latest) => (!latest || latest.status === "pending" ? 3000 : 0),
      revalidateOnFocus: true,
    },
  )

  const status: Status | undefined = data?.status

  const start = async (fresh = false) => {
    setIsStarting(true)
    setError("")
    try {
      const res = await fetch("/api/phone/whatsapp-verification/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fresh }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || "Não foi possível gerar o código.")
      setAttempt({ id: body.id, code: body.code, link: body.link })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o código.")
    } finally {
      setIsStarting(false)
    }
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    setOnAndroid(isAndroid())
    setOnMobile(isMobileDevice())
    start()
  }, [])

  const resolve = async (confirm: boolean) => {
    if (!attempt) return
    setIsConfirming(true)
    setError("")
    try {
      const res = await fetch(`/api/phone/whatsapp-verification/${attempt.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm, isProfessional }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || "Não foi possível confirmar.")
      if (confirm) {
        onVerified(body.phone, body.message)
      } else {
        await mutate()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível confirmar.")
      await mutate()
    } finally {
      setIsConfirming(false)
    }
  }

  if (isStarting && !attempt) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Gerando código...
      </div>
    )
  }

  const needsNewCode = !attempt || status === "expired" || status === "rejected"

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm leading-relaxed text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {attempt && status === "received" && data?.phone ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/40 p-4 text-center">
            <p className="text-sm text-muted-foreground">Recebemos sua mensagem do número</p>
            <p className="font-mono text-xl font-semibold tracking-wide">{data.phone}</p>
            <p className="text-sm text-muted-foreground">Este número é seu?</p>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isConfirming}
              onClick={() => resolve(false)}
            >
              Não é meu
            </Button>
            <Button type="button" className="flex-1 gap-2" disabled={isConfirming} onClick={() => resolve(true)}>
              {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Sim, é meu
            </Button>
          </div>
        </div>
      ) : needsNewCode ? (
        <div className="flex flex-col gap-3">
          {attempt && (
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              {status === "rejected"
                ? "Validação cancelada. Gere um novo código e envie pelo seu WhatsApp."
                : "O código expirou. Gere um novo para continuar."}
            </p>
          )}
          <Button type="button" variant="outline" className="gap-2" disabled={isStarting} onClick={() => start(true)}>
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Gerar novo código
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ol className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
            <li>
              {onMobile
                ? "1. Toque no botão abaixo para abrir o WhatsApp com a mensagem pronta."
                : "1. Aponte a câmera do seu celular para o QR code. O WhatsApp abre com a mensagem pronta."}
            </li>
            <li>2. Envie a mensagem sem alterar o código.</li>
            <li>3. Volte aqui para confirmar seu número.</li>
          </ol>

          {onMobile ? (
            <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/40 p-3">
              <span className="text-xs text-muted-foreground">Seu código</span>
              <span className="font-mono text-2xl font-semibold tracking-widest">{attempt.code}</span>
            </div>
          ) : (
            <VerificationQrCode link={attempt.link} code={attempt.code} />
          )}

          {!onMobile ? (
            <Button asChild variant="outline" className="gap-2">
              <a href={attempt.link} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Prefiro usar o WhatsApp deste computador
              </a>
            </Button>
          ) : onAndroid ? (
            <div className="flex flex-col gap-2">
              <Button asChild className="gap-2 bg-[#25D366] text-[#0b141a] hover:bg-[#1ebe5b]">
                <a href={buildAndroidAppLink(attempt.link, "personal")}>
                  <MessageCircle className="h-4 w-4" />
                  Enviar pelo WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href={buildAndroidAppLink(attempt.link, "business")}>
                  <MessageCircle className="h-4 w-4" />
                  Enviar pelo WhatsApp Business
                </a>
              </Button>
            </div>
          ) : (
            <Button asChild className="gap-2 bg-[#25D366] text-[#0b141a] hover:bg-[#1ebe5b]">
              <a href={attempt.link} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Enviar pelo WhatsApp
              </a>
            </Button>
          )}

          {onMobile && (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                aria-expanded={showQrOnMobile}
                onClick={() => setShowQrOnMobile((open) => !open)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <QrCode className="h-4 w-4" />
                {showQrOnMobile ? "Ocultar QR code" : "WhatsApp em outro celular? Mostrar QR code"}
              </button>
              {showQrOnMobile && <VerificationQrCode link={attempt.link} />}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Aguardando sua mensagem...
          </div>
        </div>
      )}
    </div>
  )
}
