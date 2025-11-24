"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import RequestForm from "@/components/request-form"
import SearchRequests from "@/components/search-requests"
import RegisterForm from "@/components/register-form"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { BackToTopButton } from "@/components/back-to-top-button"
import { useSearchParams } from "next/navigation"
import ForgotPasswordForm from "@/components/forgot-password-form"

export default function Home() {
  const { email: authenticatedEmail, login, isLoading } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [activeTab, setActiveTab] = useState("procurar")
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!authenticatedEmail) return

    const needId = searchParams?.get("needId")
    if (needId) {
      console.log("[v0] Opening need from URL parameter:", needId)
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmittingLogin(true)
    const trimmedEmail = loginEmail.trim()
    const trimmedPassword = loginPassword.trim()

    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedPassword) {
      toast({
        title: "Erro de autenticação",
        description: "Por favor, insira um email e senha válidos.",
        variant: "destructive",
      })
      setIsSubmittingLogin(false)
      return
    }

    try {
      const success = await login(trimmedEmail, trimmedPassword)
      if (!success) {
        toast({
          title: "Falha na autenticação",
          description: "Email ou senha incorretos. Tente novamente.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Login bem-sucedido!",
          description: "Você está logado.",
          variant: "success",
        })
        setLoginEmail("")
        setLoginPassword("")
      }
    } catch (error) {
      console.error("Authentication error:", error)
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro durante a autenticação. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingLogin(false)
    }
  }

  const handleSearchChange = (query: string) => {
    console.log("[v0] Header search changed to:", query)
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
              {isForgotPassword ? (
                <ForgotPasswordForm onBack={() => setIsForgotPassword(false)} />
              ) : isRegistering ? (
                <RegisterForm onSwitchToLogin={() => setIsRegistering(false)} />
              ) : (
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
                      Entre com seu email e senha para solicitar ou procurar serviço.
                    </p>
                  </div>

                  <Card>
                    <CardContent className="pt-6">
                      <form onSubmit={handleLogin} className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="voce@email.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="password">Senha</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Sua senha"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                          <Button
                            type="button"
                            variant="link"
                            className="text-xs text-blue-600 p-0 h-auto justify-end"
                            onClick={() => setIsForgotPassword(true)}
                          >
                            Esqueceu a senha?
                          </Button>
                        </div>
                        <div className="grid gap-2">
                          <Button
                            type="submit"
                            className="w-full bg-[#4F7CFF] hover:bg-[#4F7CFF]/90"
                            disabled={isSubmittingLogin}
                          >
                            {isSubmittingLogin ? "Entrando..." : "Entrar"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full border-yellow-300 text-yellow-900 bg-transparent"
                            onClick={() => setIsRegistering(true)}
                            disabled={isSubmittingLogin}
                          >
                            Criar conta
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}
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
