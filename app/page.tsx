"use client"

import { useState, useEffect, useRef } from "react"
import { SiteHeader } from "@/components/site-header"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import RequestForm from "@/components/request-form"
import SearchRequests from "@/components/search-requests"
import { GuestLanding } from "@/components/guest-landing"
import { LoginBackground } from "@/components/login-background"
import { BackToTopButton } from "@/components/back-to-top-button"
import {
  claimPendingRequest,
  clearPendingRef,
  decodePendingRef,
  getPendingRef,
  hasPendingRequest,
  restoreDraftLocally,
  takePendingInterest,
} from "@/lib/pending-request"
import { SiteFooter } from "@/components/site-footer"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

const AUTH_ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  other_browser: {
    title: "Abra o link no mesmo navegador",
    description:
      "O link foi aberto em um navegador diferente do que pediu o acesso. Peça um novo link e abra-o no mesmo app ou navegador.",
  },
  link_expired: {
    title: "Link expirado ou já usado",
    description: "Peça um novo link de acesso. Cada link funciona uma única vez.",
  },
  profile_failed: {
    title: "Não conseguimos concluir seu cadastro",
    description: "Tente entrar novamente. Se continuar, fale com o suporte.",
  },
  auth_failed: {
    title: "Não foi possível entrar",
    description: "Tente novamente ou entre com o Google.",
  },
}

export default function Home() {
  const { email: authenticatedEmail, isLoading } = useAuth()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const claimingRef = useRef<string | null>(null)

  // Processar OAuth callback com token no hash
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes("access_token")) {
      // O Supabase auth listener automaticamente processa o hash
      // Apenas aguardamos o hook use-auth detectar a sessão
    }
  }, [])

  useEffect(() => {
    const authError = searchParams?.get("auth_error")
    if (!authError) return

    const url = new URL(window.location.href)
    url.searchParams.delete("auth_error")
    window.history.replaceState(null, "", url.pathname + url.search + url.hash)

    const message = AUTH_ERROR_MESSAGES[authError] ?? AUTH_ERROR_MESSAGES.auth_failed
    toast({ title: message.title, description: message.description, variant: "destructive" })
  }, [searchParams, toast])

  useEffect(() => {
    if (!authenticatedEmail) return

    const needId = searchParams?.get("needId") || takePendingInterest()
    if (needId) {
      window.dispatchEvent(new CustomEvent("openNeed", { detail: needId }))
    }
  }, [searchParams, authenticatedEmail])

  useEffect(() => {
    if (!authenticatedEmail) return

    const ref = decodePendingRef(searchParams?.get("pending")) ?? getPendingRef()
    if (searchParams?.get("pending")) {
      const url = new URL(window.location.href)
      url.searchParams.delete("pending")
      window.history.replaceState(null, "", url.pathname + url.search + url.hash)
    }

    if (!ref) {
      if (hasPendingRequest()) setActiveTab("solicitar")
      return
    }
    if (claimingRef.current === ref.id) return
    claimingRef.current = ref.id

    claimPendingRequest(ref)
      .then((result) => {
        clearPendingRef()
        if (result.status === "published") {
          setActiveTab("minhas-solicitacoes")
          toast({
            title: "Pedido publicado!",
            description: "Os profissionais da sua região já podem ver e enviar propostas.",
            variant: "success",
          })
        } else if (result.status === "incomplete" || result.status === "failed") {
          restoreDraftLocally(result.draft)
          setActiveTab("solicitar")
          toast({
            title: result.status === "incomplete" ? "Falta pouco para publicar" : "Não conseguimos publicar",
            description: "Confira os dados do pedido e clique em publicar.",
          })
        } else if (hasPendingRequest()) {
          setActiveTab("solicitar")
        }
      })
      .catch(() => {
        claimingRef.current = null
      })
  }, [authenticatedEmail, searchParams, toast])

  useEffect(() => {
    if (!authenticatedEmail) return

    const handleScroll = () => {
      const tabsElement = document.querySelector('[role="tablist"]')
      if (!tabsElement) return

      const tabsRect = tabsElement.getBoundingClientRect()
      const headerHeight = 64
      const scrollDistance = Math.max(0, -tabsRect.top + headerHeight)
      const maxScroll = 100
      const opacity = Math.min(scrollDistance / maxScroll, 1)
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [authenticatedEmail])

  const [activeTab, setActiveTab] = useState("procurar")
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setShowFilters(false)
  }

  const getTabTitle = () => {
    switch (activeTab) {
      case "procurar":
        return "Serviços Disponíveis"
      case "solicitar":
        return "Solicitar Serviço"
      case "meus-servicos":
        return "Meus Serviços"
      case "minhas-solicitacoes":
        return "Minhas Solicitações"
      default:
        return "Serviços Disponíveis"
    }
  }

  const isLogged = !!authenticatedEmail

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-900">
        <p>Carregando autenticação...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {isLogged && (
        <SiteHeader
          onSolicitarClick={() => handleTabChange("solicitar")}
          onMeusServicosClick={() => handleTabChange("meus-servicos")}
          onMinhasSolicitacoesClick={() => handleTabChange("minhas-solicitacoes")}
          onHomeClick={() => handleTabChange("procurar")}
          onSearchChange={handleSearchChange}
        />
      )}

      {isLogged && (
        <div className="sticky top-16 z-30 bg-gray-100 dark:bg-gray-950 px-4 sm:px-6 lg:px-8 py-4 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="mx-auto max-w-6xl flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{getTabTitle()}</h2>
            {(activeTab === "procurar" || activeTab === "minhas-solicitacoes" || activeTab === "meus-servicos") && (
              <Button
                variant="outline"
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 gap-2 text-sm h-10 px-4"
                onClick={() => setShowFilters(!showFilters)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                {showFilters ? "Esconder Filtros" : "Filtrar"}
              </Button>
            )}
          </div>
        </div>
      )}

      <section className="relative overflow-clip flex-grow">
        {isLogged ? (
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-blue-50/30 to-transparent dark:from-gray-900/50 dark:via-gray-950/30 dark:to-transparent" />
        ) : (
          <LoginBackground />
        )}
        <div
          className={`relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14 ${
            isLogged ? "" : "pointer-events-none"
          }`}
        >
          {!isLogged ? (
            <GuestLanding />
          ) : (
            <>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsContent value="solicitar" className="space-y-4 mt-0">
                  <RequestForm />
                </TabsContent>
                <TabsContent value="procurar" className="space-y-4 mt-0">
                  <SearchRequests showFilters={showFilters} searchQuery={searchQuery} />
                </TabsContent>
                <TabsContent value="minhas-solicitacoes" className="space-y-4 mt-0">
                  <SearchRequests initialShowMyRequests={true} showFilters={showFilters} searchQuery={searchQuery} />
                </TabsContent>
                <TabsContent value="meus-servicos" className="space-y-4 mt-0">
                  <SearchRequests
                    initialShowMyProfessionalServices={true}
                    showFilters={showFilters}
                    searchQuery={searchQuery}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </section>
      <SiteFooter clearBottomNav={isLogged} />
      {isLogged && <BackToTopButton />}
    </main>
  )
}
