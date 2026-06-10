"use client"

import { useState, useEffect, Suspense } from "react"
import dynamic from "next/dynamic"
import { SiteHeader } from "@/components/site-header"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { AuthForm } from "@/components/auth-form"
import Image from "next/image"
import { BackToTopButton } from "@/components/back-to-top-button"
import { useSearchParams } from "next/navigation"

// Lazy load heavy components - these are only needed when user is authenticated
const RequestForm = dynamic(() => import("@/components/request-form"), {
  loading: () => <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false,
})

const SearchRequests = dynamic(() => import("@/components/search-requests"), {
  loading: () => <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false,
})

export default function Home() {
  const { email: authenticatedEmail, isLoading } = useAuth()
  const searchParams = useSearchParams()

  // Log para verificar se o código está atualizado
  useEffect(() => {
    console.log("[v0] ========== FREEJOB HOME PAGE CARREGADA ==========")
    console.log("[v0] Timestamp:", new Date().toISOString())
    console.log("[v0] Email autenticado:", authenticatedEmail || "nenhum")
    console.log("[v0] Carregando:", isLoading)
    console.log("[v0] Build com OAuth Supabase singleton implementado")
    console.log("[v0] ========== FIM DO LOG ==========")
  }, [])

  // Processar OAuth callback com token no hash
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes("access_token")) {
      // O Supabase auth listener automaticamente processa o hash
      // Apenas aguardamos o hook use-auth detectar a sessão
    }
  }, [])

  useEffect(() => {
    if (!authenticatedEmail) return

    const needId = searchParams?.get("needId")
    if (needId) {
      window.dispatchEvent(new CustomEvent("openNeed", { detail: needId }))
    }
  }, [searchParams, authenticatedEmail])

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

      <section className="relative overflow-hidden flex-grow">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-blue-50/30 to-transparent dark:from-gray-900/50 dark:via-gray-950/30 dark:to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14">
          {!isLogged ? (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-8">
              <div className="w-full max-w-sm">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <Image src="/logo.png" alt="Freejob Logo" width={80} height={80} className="rounded-full" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                    <span className="text-[#4F7CFF]" translate="no">
                      Freejob
                    </span>
                    <span className="block text-[#4F7CFF] text-sm sm:text-base font-medium">
                      prático e do seu jeito
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                    Solicite ou procure serviço com facilidade
                  </p>
                </div>

                <AuthForm />
              </div>
            </div>
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
      {isLogged && <BackToTopButton />}
    </main>
  )
}
