"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { listAllChatThreadsForUser, getNeed, type ChatThread, type Need } from "@/lib/needs-store"
import { useToast } from "@/hooks/use-toast"
import ChatDialog from "@/components/chat-dialog"
import { MessageCircle, Loader2 } from 'lucide-react'
import { formatUserName } from "@/lib/format-user-name"
import { createClient } from "@/lib/supabase/client"
import { getUserProfile } from "@/lib/user-profile"

const THREADS_PER_PAGE = 30
const POLLING_INTERVAL = 5000 // 5 seconds

interface MyChatsDialogProps {
  isOpen: boolean
  onClose: () => void
  currentUserEmail: string
}

export default function MyChatsDialog({ isOpen, onClose, currentUserEmail }: MyChatsDialogProps) {
  const { toast } = useToast()
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([])
  const [isLoadingThreads, setIsLoadingThreads] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreThreads, setHasMoreThreads] = useState(true)
  const [threadsOffset, setThreadsOffset] = useState(0)
  const [selectedChatThread, setSelectedChatThread] = useState<ChatThread | null>(null)
  const [selectedNeedForChat, setSelectedNeedForChat] = useState<Need | null>(null)
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({})
  const [needDetails, setNeedDetails] = useState<Record<string, Need>>({})
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
  const lastPollTimeRef = useRef<number>(Date.now())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string>("")

  useEffect(() => {
    async function loadCurrentUserProfile() {
      if (!currentUserEmail) return
      try {
        const profile = await getUserProfile(currentUserEmail)
        if (profile) {
          setCurrentUserProfile(profile)
          setCurrentUserDisplayName(formatUserName(profile.fullName, currentUserEmail))
        } else {
          setCurrentUserDisplayName(currentUserEmail.split("@")[0])
        }
      } catch (error) {
        console.error("Error loading current user profile:", error)
        setCurrentUserDisplayName(currentUserEmail.split("@")[0])
      }
    }
    if (isOpen) {
      loadCurrentUserProfile()
    }
  }, [currentUserEmail, isOpen])

  const loadMoreThreads = useCallback(async () => {
    if (isLoadingMore || !hasMoreThreads || !isOpen) return

    setIsLoadingMore(true)
    try {
      const moreThreads = await listAllChatThreadsForUser(currentUserEmail, {
        limit: THREADS_PER_PAGE,
        offset: threadsOffset,
      })

      if (moreThreads.length < THREADS_PER_PAGE) {
        setHasMoreThreads(false)
      }

      setThreadsOffset((prev) => prev + moreThreads.length)
      setChatThreads((prev) => [...prev, ...moreThreads])

      const emails = [...new Set(moreThreads.flatMap((t) => [t.requesterEmail, t.professionalEmail]))]
      const needIds = [...new Set(moreThreads.map((t) => t.needId))]

      const [profilesResult, needsResults] = await Promise.all([
        (async () => {
          const { getUserProfiles } = await import("@/lib/user-profile")
          return getUserProfiles(emails)
        })(),
        Promise.allSettled(needIds.map((needId) => getNeed(needId))),
      ])

      const formattedProfiles: Record<string, string> = {}
      for (const email of emails) {
        const profile = profilesResult[email]
        formattedProfiles[email] = formatUserName(profile?.fullName, email)
      }
      setUserProfiles((prev) => ({ ...prev, ...formattedProfiles }))

      const needs: Record<string, Need> = {}
      needsResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          needs[needIds[index]] = result.value
        }
      })
      setNeedDetails((prev) => ({ ...prev, ...needs }))
    } catch (error) {
      console.error("Erro ao carregar mais threads:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentUserEmail, threadsOffset, isLoadingMore, hasMoreThreads, isOpen])

  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea
      if (scrollHeight - scrollTop - clientHeight < 100 && !isLoadingMore && hasMoreThreads) {
        loadMoreThreads()
      }
    }

    scrollArea.addEventListener("scroll", handleScroll)
    return () => scrollArea.removeEventListener("scroll", handleScroll)
  }, [loadMoreThreads, isLoadingMore, hasMoreThreads])

  const fetchThreads = async (silent = false) => {
    if (!isOpen) return

    if (!silent) {
      setIsLoadingThreads(true)
    }
    setHasMoreThreads(true)
    setThreadsOffset(0)

    const previousThreads = chatThreads

    try {
      const threads = await listAllChatThreadsForUser(currentUserEmail, {
        limit: THREADS_PER_PAGE,
        offset: 0,
      })

      if (threads.length < THREADS_PER_PAGE) {
        setHasMoreThreads(false)
      }

      setThreadsOffset(threads.length)
      setChatThreads(threads)
      if (!silent) {
        setIsLoadingThreads(false)
      }

      const emails = [...new Set(threads.flatMap((t) => [t.requesterEmail, t.professionalEmail]))]
      const needIds = [...new Set(threads.map((t) => t.needId))]

      const [profilesResult, needsResults] = await Promise.all([
        (async () => {
          const { getUserProfiles } = await import("@/lib/user-profile")
          return getUserProfiles(emails)
        })(),
        Promise.allSettled(needIds.map((needId) => getNeed(needId))),
      ])

      const formattedProfiles: Record<string, string> = {}
      for (const email of emails) {
        const profile = profilesResult[email]
        formattedProfiles[email] = formatUserName(profile?.fullName, email)
      }
      setUserProfiles(formattedProfiles)

      const needs: Record<string, Need> = {}
      needsResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          needs[needIds[index]] = result.value
        }
      })
      setNeedDetails(needs)
    } catch (error) {
      console.error("Erro ao buscar todos os threads de chat:", error)
      if (!silent) {
        toast({
          title: "Erro ao carregar chats",
          description: "Não foi possível carregar suas conversas.",
          variant: "destructive",
        })
        setChatThreads([])
        setIsLoadingThreads(false)
      }
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchThreads()
    }
  }, [isOpen, currentUserEmail])

  useEffect(() => {
    if (!isOpen || selectedChatThread) return

    const pollForUpdates = async () => {
      const now = Date.now()
      if (now - lastPollTimeRef.current < POLLING_INTERVAL) return

      lastPollTimeRef.current = now
      await fetchThreads(true)
    }

    pollingIntervalRef.current = setInterval(pollForUpdates, POLLING_INTERVAL)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isOpen, selectedChatThread, currentUserEmail])

  useEffect(() => {
    if (!isOpen) return

    const supabase = createClient()

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`chat_updates_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async () => {
          await fetchThreads(true)
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [isOpen, currentUserEmail])

  const handleOpenSpecificChat = async (thread: ChatThread) => {
    const localNeedDetails = needDetails[thread.needId]

    let needDetailsToUse = localNeedDetails

    if (!needDetailsToUse) {
      needDetailsToUse = await getNeed(thread.needId)
    }

    if (needDetailsToUse && needDetailsToUse.title) {
      const needWithProfessionalEmail = {
        ...needDetailsToUse,
        professionalEmail: thread.professionalEmail,
      }
      setSelectedNeedForChat(needWithProfessionalEmail as Need)
      setSelectedChatThread(thread)
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do serviço para este chat.",
        variant: "destructive",
      })
    }
  }

  const handleCloseChatDialog = () => {
    setSelectedChatThread(null)
    setSelectedNeedForChat(null)
    fetchThreads()
  }

  const hasUnreadMessages = (thread: ChatThread): boolean => {
    if (!thread.messages || thread.messages.length === 0) return false
    const lastReadTimestamp =
      thread.requesterEmail === currentUserEmail ? thread.lastReadByRequester : thread.lastReadByProfessional

    const unreadCount = thread.messages.filter((msg) => {
      const isFromOtherUser = msg.email !== currentUserEmail && msg.type === "user"
      if (!isFromOtherUser) return false

      if (!lastReadTimestamp) return true

      return new Date(msg.createdAt) > new Date(lastReadTimestamp)
    }).length

    return unreadCount > 0
  }

  const formatMessageDateTime = (dateString: string): string => {
    const messageDate = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())

    if (messageDay.getTime() === today.getTime()) {
      return messageDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }

    if (messageDay.getTime() === yesterday.getTime()) {
      return "Ontem"
    }

    if (messageDate.getFullYear() !== now.getFullYear()) {
      return messageDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    return messageDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  }

  if (selectedChatThread && selectedNeedForChat) {
    if (!selectedNeedForChat.title) {
      return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogTitle className="sr-only">Carregando Detalhes do Serviço</DialogTitle>
            <p className="text-center">Carregando detalhes do serviço...</p>
          </DialogContent>
        </Dialog>
      )
    }

    return (
      <ChatDialog
        need={selectedNeedForChat}
        isOpen={true}
        onClose={handleCloseChatDialog}
        currentUserEmail={currentUserEmail}
        chatThreadId={selectedChatThread.id}
      />
    )
  }

  return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] flex flex-col h-[80vh] bg-background border-0 shadow-none p-0">
        <DialogTitle className="sr-only">Minhas Conversas</DialogTitle>
        <div className="border-b px-4 py-4 bg-background flex items-center gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-border">
            {currentUserProfile?.profileImageUrl && (
              <AvatarImage
                src={currentUserProfile.profileImageUrl || "/placeholder.svg"}
                alt={currentUserDisplayName}
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
              {currentUserDisplayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-left">Minhas Conversas</h2>
            <p className="text-sm text-muted-foreground text-left">
              Todos os seus chats ativos como solicitante ou profissional.
            </p>
          </div>
        </div>
        <ScrollArea className="flex-1 p-0 overflow-y-auto" ref={scrollAreaRef}>
          {isLoadingThreads ? (
            <p className="text-center text-muted-foreground py-4">Carregando suas conversas...</p>
          ) : chatThreads.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Você não tem conversas ativas ainda.</p>
          ) : (
            <div className="grid gap-0">
              {chatThreads.map((thread) => {
                const lastReadTimestamp =
                  thread.requesterEmail === currentUserEmail
                    ? thread.lastReadByRequester
                    : thread.lastReadByProfessional

                const unreadCount =
                  thread.messages?.filter((msg) => {
                    const isFromOtherUser = msg.email !== currentUserEmail && msg.type === "user"
                    if (!isFromOtherUser) return false

                    if (!lastReadTimestamp) return true

                    return new Date(msg.createdAt) > new Date(lastReadTimestamp)
                  }).length || 0

                const lastMessage =
                  thread.messages && thread.messages.length > 0 ? thread.messages[thread.messages.length - 1] : null

                const otherUserEmail =
                  thread.requesterEmail === currentUserEmail ? thread.professionalEmail : thread.requesterEmail
                const otherUserName = userProfiles[otherUserEmail] || otherUserEmail.split("@")[0]
                const need = needDetails[thread.needId]
                const serviceImage = need?.images?.[0] || need?.imageUrl || null
                const serviceTitle = need?.title || `Serviço #${thread.needId.slice(0, 8)}`

                const messageText = lastMessage ? lastMessage.text || lastMessage.content || "" : ""

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleOpenSpecificChat(thread)}
                    className="flex items-center gap-3 px-4 py-3 bg-card last:border-b-0 cursor-pointer hover:bg-accent transition-colors border-b"
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      {serviceImage ? (
                        <AvatarImage
                          src={serviceImage || "/placeholder.svg"}
                          alt={serviceTitle}
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <MessageCircle className="h-6 w-6" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{otherUserName}</p>
                        <span className="text-muted-foreground">•</span>
                        <p className="text-sm font-medium text-primary truncate">{serviceTitle}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {thread.requesterEmail === currentUserEmail ? "Profissional" : "Solicitante"}
                      </p>
                      {unreadCount > 0 ? (
                        <div className="flex items-end justify-between gap-2 mt-1">
                          <p className="text-xs font-medium text-blue-600 flex-1">
                            {unreadCount} {unreadCount === 1 ? "nova mensagem" : "novas mensagens"}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {lastMessage
                              ? formatMessageDateTime(lastMessage.createdAt)
                              : formatMessageDateTime(thread.updatedAt)}
                          </span>
                        </div>
                      ) : messageText ? (
                        <div className="flex items-end justify-between gap-2 mt-1">
                          <p className="text-xs text-muted-foreground line-clamp-1 flex-1">{messageText}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {lastMessage
                              ? formatMessageDateTime(lastMessage.createdAt)
                              : formatMessageDateTime(thread.updatedAt)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Sem mensagens</p>
                      )}
                    </div>
                  </div>
                )
              })}
              {isLoadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!hasMoreThreads && chatThreads.length > 0 && (
                <div className="text-center text-xs text-muted-foreground py-4">
                  Todas as conversas foram carregadas
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        <div className="px-4 py-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
