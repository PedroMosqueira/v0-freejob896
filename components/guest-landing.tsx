"use client"

import { useId, useRef, useState } from "react"
import Image from "next/image"
import { ArrowLeft, ArrowRight, MessageCircle, Search, LogIn, CheckCircle2, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AuthForm } from "@/components/auth-form"
import { RequestFormAIChat } from "@/components/request-form-ai-chat"
import { GuestNeedsPreview } from "@/components/guest-needs-preview"
import { ChatLoginPrompt } from "@/components/chat-login-prompt"
import { savePendingInterest, savePendingRequest, type PendingRequestRef } from "@/lib/pending-request"

type View = "inicio" | "solicitar" | "entrar"

interface LoginContext {
  title: string
  message: string
}

const TEXT_SHADOW = "[text-shadow:0_2px_4px_rgba(0,0,0,0.85),0_4px_16px_rgba(0,0,0,0.7)]"
const PANEL_SHADOW = "shadow-[0_12px_40px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.45)]"

export function GuestLanding() {
  const [view, setView] = useState<View>("inicio")
  const [browseOpen, setBrowseOpen] = useState(false)
  const [expandedCard, setExpandedCard] = useState<"solicitar" | "procurar" | null>(null)
  const [loginContext, setLoginContext] = useState<LoginContext | null>(null)
  const [imagesDropped, setImagesDropped] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [pendingRef, setPendingRef] = useState<PendingRequestRef | null>(null)

  const goToLogin = (context: LoginContext | null) => {
    setLoginContext(context)
    setView("entrar")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleRequestComplete = async (info: Parameters<typeof savePendingRequest>[0]) => {
    setSavingDraft(true)
    try {
      const { imagesDropped, ref } = await savePendingRequest(info)
      setImagesDropped(imagesDropped)
      setPendingRef(ref)
    } finally {
      setSavingDraft(false)
    }
  }

  const handleInterest = (needId: string) => {
    savePendingInterest(needId)
    setBrowseOpen(false)
    goToLogin({
      title: "Quase lá",
      message: "Entre ou crie sua conta para enviar seu interesse. Depois do login, o serviço abre direto para você.",
    })
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col">
      <nav aria-label="Acesso" className="pointer-events-auto flex items-center justify-end self-end">
        {view !== "entrar" && (
          <button
            type="button"
            onClick={() => goToLogin(null)}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1D4ED8] shadow-[0_6px_20px_rgba(0,0,0,0.45)] transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1631]"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Entrar
          </button>
        )}
      </nav>

      <div className="flex w-full flex-1 items-center justify-center py-8">
      <div className={`pointer-events-auto ${view === "solicitar" ? "w-full max-w-2xl" : "w-full max-w-md"}`}>
        <header className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.png"
            alt="Freejob"
            width={view === "inicio" ? 80 : 56}
            height={view === "inicio" ? 80 : 56}
            className="rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.6),0_0_0_4px_rgba(5,13,31,0.55)]"
          />
          <h1 className={`text-2xl font-extrabold leading-tight sm:text-3xl ${TEXT_SHADOW}`}>
            <span className="text-[#6B93FF]" translate="no">
              Freejob
            </span>
            <span className="block text-sm font-medium text-blue-100 sm:text-base">prático e do seu jeito</span>
          </h1>
        </header>

        {view === "inicio" && (
          <div className="flex flex-col gap-4">
            <p className={`text-center text-base text-blue-100 text-pretty ${TEXT_SHADOW}`}>
              O que você quer fazer hoje?
            </p>

            <ChoiceCard
              icon={<RequestServiceIcon />}
              title="Solicitar um serviço"
              description="Conte o que precisa em uma conversa rápida e receba propostas de profissionais da sua região."
              actionLabel="Começar conversa"
              expanded={expandedCard === "solicitar"}
              onExpandChange={(open) => setExpandedCard(open ? "solicitar" : null)}
              onAction={() => setView("solicitar")}
            />
            <ChoiceCard
              icon={<Search className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />}
              title="Quero fazer serviços"
              description="Veja pedidos abertos perto de você e mostre interesse nos que combinam com o que você faz."
              actionLabel="Ver serviços abertos"
              expanded={expandedCard === "procurar"}
              onExpandChange={(open) => setExpandedCard(open ? "procurar" : null)}
              onAction={() => setBrowseOpen(true)}
            />

            <div className="mt-2 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-white/20" />
              <span className={`text-sm text-blue-100/80 ${TEXT_SHADOW}`}>ou</span>
              <span className="h-px flex-1 bg-white/20" />
            </div>

            <button
              type="button"
              onClick={() => goToLogin(null)}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/80 bg-white/10 px-5 py-4 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1631] ${PANEL_SHADOW}`}
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              Já tenho conta, quero entrar
            </button>
          </div>
        )}

        {view === "solicitar" && (
          <div className="flex flex-col gap-3">
            <BackButton onClick={() => setView("inicio")} />
            <div className={`flex h-[min(640px,calc(100vh-14rem))] flex-col rounded-xl ${PANEL_SHADOW}`}>
              <RequestFormAIChat
                onExtract={() => {}}
                onComplete={handleRequestComplete}
                confirmMessage="Perfeito, pedido confirmado!"
                hideEditInForm
                afterComplete={
                  <ChatLoginPrompt imagesDropped={imagesDropped} saving={savingDraft} pendingRef={pendingRef} />
                }
              />
            </div>
            <p className={`text-center text-xs text-blue-100/80 ${TEXT_SHADOW}`}>
              Ao confirmar, você entra com Google ou e-mail aqui mesmo no chat. Nada é publicado antes disso.
            </p>
          </div>
        )}

        {view === "entrar" && (
          <div className="flex flex-col gap-3">
            <BackButton
              onClick={() => {
                setLoginContext(null)
                setView("inicio")
              }}
            />
            {loginContext && (
              <div
                role="status"
                className="flex gap-3 rounded-xl border border-emerald-400/40 bg-emerald-950/80 p-4 text-emerald-50 backdrop-blur-sm"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{loginContext.title}</p>
                  <p className="text-sm leading-relaxed text-emerald-100/90">{loginContext.message}</p>
                </div>
              </div>
            )}
            <div className={`rounded-xl ${PANEL_SHADOW}`}>
              <AuthForm />
            </div>
          </div>
        )}
      </div>
      </div>

      <Sheet open={browseOpen} onOpenChange={setBrowseOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-4 overflow-y-auto sm:w-1/2 sm:max-w-none lg:w-1/3"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Serviços abertos agora</SheetTitle>
            <SheetDescription className="leading-relaxed">
              Uma amostra dos pedidos mais recentes. Entre para ver todos, filtrar por região e conversar com os clientes.
            </SheetDescription>
          </SheetHeader>
          <GuestNeedsPreview onInterest={handleInterest} />
          <Button
            variant="outline"
            className="mt-auto"
            onClick={() => {
              setBrowseOpen(false)
              goToLogin({
                title: "Veja todos os serviços",
                message: "Entre ou crie sua conta para acessar o painel completo de pedidos.",
              })
            }}
          >
            Entrar para ver todos
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function RequestServiceIcon() {
  return (
    <span className="relative flex h-11 w-11 items-center justify-center" aria-hidden="true">
      <MessageCircle className="absolute inset-0 h-11 w-11 fill-white text-white" strokeWidth={1.25} />
      <span className="relative flex h-6 w-6 items-center justify-center">
        <Wrench className="absolute h-6 w-6 text-[#3B73EE]" strokeWidth={2.25} />
        <Wrench className="absolute h-6 w-6 -scale-x-100 text-white" strokeWidth={5} />
        <Wrench className="absolute h-6 w-6 -scale-x-100 text-[#3B73EE]" strokeWidth={2.25} />
      </span>
    </span>
  )
}

function ChoiceCard({
  icon,
  title,
  description,
  actionLabel,
  expanded,
  onExpandChange,
  onAction,
}: {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel: string
  expanded: boolean
  onExpandChange: (expanded: boolean) => void
  onAction: () => void
}) {
  const descriptionId = useId()
  const pointerTypeRef = useRef<string>("mouse")
  const expandedOnPressRef = useRef(false)

  // On touch screens the first tap only reveals the description; the second tap acts.
  const handleClick = () => {
    if (pointerTypeRef.current !== "mouse" && pointerTypeRef.current !== "" && !expandedOnPressRef.current) {
      onExpandChange(true)
      return
    }
    onAction()
  }

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-describedby={descriptionId}
      onPointerDown={(event) => {
        pointerTypeRef.current = event.pointerType
        expandedOnPressRef.current = expanded
      }}
      onKeyDown={() => {
        pointerTypeRef.current = ""
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onExpandChange(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") onExpandChange(false)
      }}
      onFocus={() => onExpandChange(true)}
      onBlur={() => onExpandChange(false)}
      onClick={handleClick}
      className={`group flex w-full flex-col rounded-2xl border bg-[#0B1631]/85 p-5 text-left text-blue-50 backdrop-blur-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:p-6 ${PANEL_SHADOW} ${
        expanded ? "border-[#3B73EE] bg-[#0E1C3F]/95" : "border-white/10"
      }`}
    >
      <span className="flex items-center gap-4">
        <span
          className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-[#3B73EE] text-white ring-4 ring-white/15 transition-transform duration-300 shadow-[0_6px_20px_rgba(59,115,238,0.55)] ${
            expanded ? "scale-105" : ""
          }`}
        >
          {icon}
        </span>
        <span className="flex-1 text-xl font-bold leading-tight text-white text-balance sm:text-2xl">{title}</span>
        <ArrowRight
          className={`h-6 w-6 flex-shrink-0 text-white transition-transform duration-300 ${
            expanded ? "translate-x-0.5" : "opacity-60"
          }`}
          aria-hidden="true"
        />
      </span>

      <span
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <span className="overflow-hidden">
          <span className="flex flex-col gap-3 pt-4">
            <span id={descriptionId} className="text-base leading-relaxed text-blue-100/85">
              {description}
            </span>
            <span className="flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1D4ED8]">
              {actionLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </span>
        </span>
      </span>
    </button>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-blue-100 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B93FF] ${TEXT_SHADOW}`}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Voltar
    </button>
  )
}
