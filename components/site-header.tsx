"use client"

import type React from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { MessageCircle, Menu, User, Briefcase, List, LogOut, Lock, Plus, Search, Home, Sun, Moon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useState, useRef, useEffect } from "react"
import MyChatsDialog from "@/components/my-chats-dialog"
import UpdatePasswordForm from "@/components/update-password-form"
import NotificationsDropdown from "@/components/notifications-dropdown"
import { listAllChatThreadsForUser } from "@/lib/needs-store"
import { createClient } from "@/lib/supabase/client"
import { getUserProfile } from "@/lib/user-profile"
import { formatUserName } from "@/lib/format-user-name"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "@/components/theme-provider"
import InstallAppButton from "./install-app-button"

interface SiteHeaderProps {
  onSolicitarClick?: () => void
  onMeusServicosClick?: () => void
  onMinhasSolicitacoesClick?: () => void
  onSearchChange?: (query: string) => void
  onHomeClick?: () => void
}

export function SiteHeader({
  onSolicitarClick,
  onMeusServicosClick,
  onMinhasSolicitacoesClick,
  onSearchChange,
  onHomeClick,
}: SiteHeaderProps) {
  const { email, logout } = useAuth()
  const [isMyChatsDialogOpen, setIsMyChatsDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [displayName, setDisplayName] = useState<string>("")
  const [userProfile, setUserProfile] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  // Calculate effective theme considering "system"
  const effectiveTheme = mounted
    ? theme === "system"
      ? typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme
    : "light"

  const toggleTheme = () => {
    const newTheme = effectiveTheme === "dark" ? "light" : "dark"
    console.log("[v0] Toggle theme from", theme, "to", newTheme)
    setTheme(newTheme)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function loadUserProfile() {
      if (!email) return

      try {
        const profile = await getUserProfile(email)
        if (profile) {
          setUserProfile(profile)
          console.log("[v0] User profile loaded:", { email, profileImageUrl: profile.profileImageUrl })
          const name = formatUserName(profile.fullName, email, false)
          setDisplayName(name)
        } else {
          setDisplayName(email.split("@")[0])
        }
      } catch (error) {
        console.error("Error loading user profile:", error)
        setDisplayName(email.split("@")[0])
      }
    }

    loadUserProfile()
  }, [email])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMobileSheetOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    async function loadUnreadCount() {
      if (!email || !mounted) return

      try {
        console.log("[v0] 🟡 Loading unread count for:", email)
        const threads = await listAllChatThreadsForUser(email)
        console.log("[v0] 🟡 Total threads:", threads.length)
        let count = 0

        threads.forEach((thread) => {
          const messages = thread.messages || []
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1]

            const isRequester = thread.requesterEmail === email
            const lastReadTimestamp = isRequester ? thread.lastReadByRequester : thread.lastReadByProfessional

            console.log("[v0] 🟡 Thread:", thread.id, {
              lastMessage: lastMessage.text.substring(0, 30),
              lastMessageEmail: lastMessage.email,
              currentUserEmail: email,
              lastReadTimestamp,
              lastMessageCreatedAt: lastMessage.createdAt,
            })

            if (lastMessage.email !== email && lastMessage.type === "user") {
              if (!lastReadTimestamp || new Date(lastMessage.createdAt) > new Date(lastReadTimestamp)) {
                count++
                console.log("[v0] 🟡 Thread marked as unread:", thread.id)
              }
            }
          }
        })

        console.log("[v0] 🟡 Final unread count:", count)
        setUnreadMessagesCount(count)
      } catch (error) {
        console.error("[v0] 🔴 Error loading unread messages count:", error)
      }
    }

    loadUnreadCount()
  }, [email, mounted])

  useEffect(() => {
    if (!email || !mounted) return

    const supabase = createClient()

    const channel = supabase
      .channel("chat-threads-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_threads",
        },
        async () => {
          const threads = await listAllChatThreadsForUser(email)
          let count = 0

          threads.forEach((thread) => {
            const messages = thread.messages || []
            if (messages.length > 0) {
              const lastMessage = messages[messages.length - 1]
              if (lastMessage.email !== email && lastMessage.type === "user") {
                const isRequester = thread.requesterEmail === email
                const lastReadTimestamp = isRequester ? thread.lastReadByRequester : thread.lastReadByProfessional

                if (!lastReadTimestamp || new Date(lastMessage.createdAt) > new Date(lastReadTimestamp)) {
                  count++
                }
              }
            }
          })

          setUnreadMessagesCount(count)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [email, mounted])

  useEffect(() => {
    console.log("[v0] Current theme:", theme)
  }, [theme])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    console.log("[v0] Search input changed to:", query)
    setSearchQuery(query)
    onSearchChange?.(query)
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-blue-50/95 dark:bg-blue-950/95 backdrop-blur supports-[backdrop-filter]:bg-blue-50/60 dark:supports-[backdrop-filter]:bg-blue-950/60">
        <div className="container flex h-16 sm:h-20 items-center justify-between gap-4 px-4 sm:px-6 relative z-10">
          {/* Logo - Left */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
              <img src="/images/logo.png" alt="Freejob Logo" className="h-12 sm:h-16" />
              <div className="flex flex-col justify-center">
                <span
                  className="font-extrabold text-2xl sm:text-4xl leading-tight text-blue-600 dark:text-blue-400"
                  translate="no"
                >
                  Freejob
                </span>
              </div>
            </Link>
          </div>

          {email && (
            <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-10 w-10 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={onHomeClick}
                title="Voltar para Serviços Disponíveis"
              >
                <Home className="h-5 w-5" />
                <span className="sr-only">Serviços Disponíveis</span>
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar serviços ou profissionais..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {/* Actions - Right */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {email ? (
              <>
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="default"
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={onSolicitarClick}
                    title="Solicitar Serviço"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="relative bg-transparent"
                    onClick={() => setIsMyChatsDialogOpen(true)}
                    title="Meus Chats"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {mounted && unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                        {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                      </span>
                    )}
                  </Button>

                  <InstallAppButton />

                  <NotificationsDropdown userEmail={email} />
                  <ThemeToggle />
                </div>
                {/* </CHANGE> */}

                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8 sm:h-10 sm:w-10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                >
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Buscar</span>
                </Button>

                <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                  <SheetTrigger className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Menu</span>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <div className="flex flex-col h-full">
                      {/* User Profile Section */}
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-6 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
                        onClick={() => setIsMobileSheetOpen(false)}
                      >
                        <Avatar className="h-12 w-12">
                          {userProfile?.profileImageUrl && (
                            <AvatarImage src={userProfile.profileImageUrl || "/placeholder.svg"} alt={displayName} />
                          )}
                          <AvatarFallback className="bg-blue-600 text-white text-base font-semibold">
                            {displayName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{email}</p>
                        </div>
                      </Link>

                      <div className="flex items-center justify-around px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            onHomeClick?.()
                            setIsMobileSheetOpen(false)
                          }}
                          title="Serviços Disponíveis"
                        >
                          <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
                          onClick={() => {
                            setIsMyChatsDialogOpen(true)
                            setIsMobileSheetOpen(false)
                          }}
                          title="Meus Chats"
                        >
                          <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          {mounted && unreadMessagesCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-semibold">
                              {unreadMessagesCount > 9 ? "9" : unreadMessagesCount}
                            </span>
                          )}
                        </button>
                        <div className="p-1.5">
                          <InstallAppButton />
                        </div>
                        <div className="p-1.5">
                          <NotificationsDropdown userEmail={email} />
                        </div>
                        <button
                          className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                          onClick={() => {
                            onSolicitarClick?.()
                            setIsMobileSheetOpen(false)
                          }}
                          title="Solicitar Serviço"
                        >
                          <Plus className="h-5 w-5 text-white" />
                        </button>
                      </div>
                      {/* </CHANGE> */}

                      {/* Navigation Options */}
                      <div className="flex-1 overflow-y-auto py-2">
                        <button
                          className="w-full flex items-center gap-3 px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            onMeusServicosClick?.()
                            setIsMobileSheetOpen(false)
                          }}
                        >
                          <Briefcase className="h-5 w-5" />
                          <span>Interesses</span>
                        </button>
                        <button
                          className="w-full flex items-center gap-3 px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            onMinhasSolicitacoesClick?.()
                            setIsMobileSheetOpen(false)
                          }}
                        >
                          <List className="h-5 w-5" />
                          <span>Solicitações</span>
                        </button>
                      </div>

                      {/* Bottom Actions */}
                      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                        <div className="w-full flex items-center gap-3 px-6 py-4 rounded-lg">
                          <span className="text-base font-medium text-gray-700 dark:text-gray-300">Tema</span>
                          <button
                            onClick={toggleTheme}
                            className="border border-gray-300 dark:border-gray-600 rounded-full p-[1px] cursor-pointer hover:border-blue-500 transition-colors relative"
                            style={{ width: "66px", height: "42px" }}
                          >
                            <div className="relative h-full flex items-center justify-between px-[3px]">
                              {/* Sun icon inside slider */}
                              <Sun className="h-5 w-5 text-yellow-500 flex-shrink-0 z-0" />

                              {/* Moving ball with current theme icon */}
                              <div
                                className="absolute h-8 w-8 bg-blue-600 dark:bg-blue-500 rounded-full shadow-md transition-all duration-300 ease-in-out flex items-center justify-center z-10"
                                style={{
                                  left: effectiveTheme === "dark" ? "calc(100% - 33px)" : "2px",
                                }}
                              >
                                {mounted && effectiveTheme === "dark" ? (
                                  <Moon className="h-4 w-4 text-white" />
                                ) : (
                                  <Sun className="h-4 w-4 text-white" />
                                )}
                              </div>

                              {/* Moon icon inside slider */}
                              <Moon className="h-5 w-5 text-blue-400 flex-shrink-0 z-0" />
                            </div>
                          </button>
                        </div>
                        {/* </CHANGE> */}

                        <button
                          className="w-full flex items-center gap-3 px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            setIsPasswordDialogOpen(true)
                            setIsMobileSheetOpen(false)
                          }}
                        >
                          <Lock className="h-4 w-4" />
                          <span>Alterar Senha</span>
                        </button>
                        <button
                          className="w-full flex items-center gap-3 px-6 py-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            logout()
                            setIsMobileSheetOpen(false)
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sair</span>
                        </button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="relative hidden md:block" ref={userMenuRef}>
                  <button
                    className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-blue-500 dark:hover:ring-blue-400 transition-all focus:outline-none focus:ring-blue-500"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    aria-label="Menu do usuário"
                  >
                    <Avatar className="h-10 w-10">
                      {userProfile?.profileImageUrl && (
                        <AvatarImage
                          src={userProfile.profileImageUrl || "/placeholder.svg"}
                          alt={displayName}
                          onError={(e) => {
                            console.log("[v0] Failed to load image:", userProfile.profileImageUrl)
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      )}
                      <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                        {displayName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-[100]">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Avatar className="h-12 w-12">
                          {userProfile?.profileImageUrl && (
                            <AvatarImage
                              src={userProfile.profileImageUrl || "/placeholder.svg"}
                              alt={displayName}
                              onError={(e) => {
                                console.log("[v0] Failed to load image:", userProfile.profileImageUrl)
                                e.currentTarget.style.display = "none"
                              }}
                            />
                          )}
                          <AvatarFallback className="bg-blue-600 text-white text-base font-semibold">
                            {displayName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{email}</p>
                        </div>
                        <User className="h-4 w-4 text-gray-400" />
                      </Link>

                      <div className="py-2">
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            onMeusServicosClick?.()
                            setIsUserMenuOpen(false)
                          }}
                        >
                          <Briefcase className="h-4 w-4" />
                          <span>Interesses</span>
                        </button>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            onMinhasSolicitacoesClick?.()
                            setIsUserMenuOpen(false)
                          }}
                        >
                          <List className="h-4 w-4" />
                          <span>Solicitações</span>
                        </button>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            setIsPasswordDialogOpen(true)
                            setIsUserMenuOpen(false)
                          }}
                        >
                          <Lock className="h-4 w-4" />
                          <span>Alterar Senha</span>
                        </button>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => {
                            logout()
                            setIsUserMenuOpen(false)
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sair</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Button
                variant="ghost"
                asChild
                className="text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Link href="/">Entrar</Link>
              </Button>
            )}
          </div>
        </div>

        {email && isMobileSearchOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="container px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar serviços ou profissionais..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Dialogs */}
      {email && (
        <>
          <MyChatsDialog
            isOpen={isMyChatsDialogOpen}
            onClose={() => setIsMyChatsDialogOpen(false)}
            currentUserEmail={email}
          />
          {isPasswordDialogOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Alterar Senha</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPasswordDialogOpen(false)}
                    className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100"
                  >
                    ✕
                  </Button>
                </div>
                <UpdatePasswordForm />
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

export default SiteHeader
