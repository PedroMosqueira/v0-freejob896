"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { MessageCircle } from "lucide-react"
import SendBidDialog from "@/components/send-bid-dialog"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Loader2 } from "lucide-react"
import {
  addChatMessage,
  getChatThreadById,
  markChatAsRead,
  acceptProposal,
  declineProposal,
  type Need,
} from "@/lib/needs-store"
import type { ChatMessage } from "@/data/needs"
import { createClient } from "@/lib/supabase/client"
import { getUserNameByEmail } from "@/lib/format-user-name"
import { toast } from "@/components/ui/use-toast"
import { getUserProfile } from "@/lib/user-profile"
import { createNotificationViaAPI } from "@/lib/notifications-client"
import { formatCurrency } from "@/lib/pricing"

const MESSAGES_PER_PAGE = 50

interface ChatDialogProps {
  need: Need
  isOpen: boolean
  onClose: () => void
  currentUserEmail: string
  chatThreadId: string
}

export default function ChatDialog({ need, isOpen, onClose, currentUserEmail, chatThreadId }: ChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [totalMessagesLoaded, setTotalMessagesLoaded] = useState(0)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [otherUserProfile, setOtherUserProfile] = useState<{ fullName: string; photoUrl?: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesStartRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout>()
  const previousScrollHeightRef = useRef<number>(0)
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null)
  const [showSendBidDialog, setShowSendBidDialog] = useState(false)
  const [chatThreadProfessionalEmail, setChatThreadProfessionalEmail] = useState<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
  }

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages) return

    setIsLoadingMore(true)
    try {
      const currentChatThread = await getChatThreadById(chatThreadId, {
        limit: MESSAGES_PER_PAGE,
        offset: totalMessagesLoaded,
      })

      if (!currentChatThread || !currentChatThread.messages || currentChatThread.messages.length === 0) {
        setHasMoreMessages(false)
        return
      }

      const olderMessages = currentChatThread.messages

      if (olderMessages.length < MESSAGES_PER_PAGE) {
        setHasMoreMessages(false)
      }

      if (scrollAreaViewportRef.current) {
        previousScrollHeightRef.current = scrollAreaViewportRef.current.scrollHeight
      }

      setMessages((prev) => [...olderMessages, ...prev])
      setTotalMessagesLoaded((prev) => prev + olderMessages.length)

      setTimeout(() => {
        if (scrollAreaViewportRef.current) {
          const newScrollHeight = scrollAreaViewportRef.current.scrollHeight
          const scrollDiff = newScrollHeight - previousScrollHeightRef.current
          scrollAreaViewportRef.current.scrollTop = scrollDiff
        }
      }, 50)
    } catch (error) {
      console.error("Error loading more messages:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [chatThreadId, totalMessagesLoaded, isLoadingMore, hasMoreMessages])

  useEffect(() => {
    const viewport = scrollAreaViewportRef.current
    if (!viewport) return

    const handleScroll = () => {
      if (viewport.scrollTop < 100 && !isLoadingMore && hasMoreMessages) {
        loadMoreMessages()
      }
    }

    viewport.addEventListener("scroll", handleScroll)
    return () => viewport.removeEventListener("scroll", handleScroll)
  }, [loadMoreMessages, isLoadingMore, hasMoreMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    async function loadChatMessages() {
      setIsLoading(true)
      setHasMoreMessages(true)
      setTotalMessagesLoaded(0)

      try {
        const currentChatThread = await getChatThreadById(chatThreadId, {
          limit: MESSAGES_PER_PAGE,
          offset: 0,
        })

        if (!currentChatThread) {
          setMessages([])
          return
        }

        const loadedMessages = currentChatThread.messages || []
        setMessages(loadedMessages)
        setTotalMessagesLoaded(loadedMessages.length)

        if (loadedMessages.length < MESSAGES_PER_PAGE) {
          setHasMoreMessages(false)
        }

        if (markAsReadTimeoutRef.current) {
          clearTimeout(markAsReadTimeoutRef.current)
        }

        markAsReadTimeoutRef.current = setTimeout(async () => {
          await markChatAsRead(chatThreadId, currentUserEmail)
        }, 1000)

        setTimeout(scrollToBottom, 50)
      } catch (error) {
        console.error("Error loading messages:", error)
        setMessages([])
      } finally {
        setIsLoading(false)
      }
    }
    if (isOpen && chatThreadId) {
      loadChatMessages()
    }

    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current)
      }
    }
  }, [isOpen, chatThreadId, currentUserEmail])

  useEffect(() => {
    if (!isOpen || !chatThreadId) return

    const supabase = createClient()

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`chat-${chatThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_threads",
          filter: `id=eq.${chatThreadId}`,
        },
        async (payload) => {
          const newMessagesArray = (payload.new as any).messages_json
          if (newMessagesArray && Array.isArray(newMessagesArray)) {
            setMessages((prevMessages) => {
              const realPrevMessages = prevMessages.filter((m) => !m.id.startsWith("temp-"))

              if (newMessagesArray.length >= realPrevMessages.length) {
                return newMessagesArray
              }

              return prevMessages
            })

            if (markAsReadTimeoutRef.current) {
              clearTimeout(markAsReadTimeoutRef.current)
            }
            markAsReadTimeoutRef.current = setTimeout(async () => {
              await markChatAsRead(chatThreadId, currentUserEmail)
            }, 1000)

            setTimeout(scrollToBottom, 100)
          }
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
  }, [isOpen, chatThreadId, currentUserEmail])

  useEffect(() => {
    async function loadUserNames() {
      const emails = Array.from(new Set(messages.map((m) => m.email).filter(Boolean))) as string[]
      const names: Record<string, string> = {}

      await Promise.all(
        emails.map(async (email) => {
          if (email && !userNames[email]) {
            const { firstName } = await getUserNameByEmail(email)
            names[email] = firstName
          }
        }),
      )

      if (Object.keys(names).length > 0) {
        setUserNames((prev) => ({ ...prev, ...names }))
      }
    }

    if (messages.length > 0) {
      loadUserNames()
    }
  }, [messages])

  useEffect(() => {
    async function loadOtherUserProfile() {
      if (!need) {
        return
      }

      const otherUserEmail = need.requesterEmail === currentUserEmail ? need.professionalEmail : need.requesterEmail

      if (!otherUserEmail) {
        return
      }

      try {
        const profile = await getUserProfile(otherUserEmail)
        if (profile) {
          setOtherUserProfile({
            fullName: profile.fullName || otherUserEmail.split("@")[0],
            photoUrl: profile.photoUrl,
          })
        } else {
          setOtherUserProfile({
            fullName: otherUserEmail.split("@")[0],
          })
        }
      } catch (error) {
        console.error("Error loading other user profile:", error)
        setOtherUserProfile({
          fullName: otherUserEmail.split("@")[0],
        })
      }
    }

    if (isOpen && need) {
      loadOtherUserProfile()
    }
  }, [isOpen, need, currentUserEmail])

  useEffect(() => {
    async function loadThreadInfo() {
      if (!chatThreadId) return

      const thread = await getChatThreadById(chatThreadId)
      if (thread) {
        setChatThreadProfessionalEmail(thread.professionalEmail)
      }
    }

    loadThreadInfo()
  }, [chatThreadId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedMessage = newMessage.trim()
    if (!trimmedMessage || isSending) return

    setNewMessage("")
    setIsSending(true)

    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      email: currentUserEmail,
      text: trimmedMessage,
      createdAt: new Date().toISOString(),
      type: "user",
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setTimeout(scrollToBottom, 50)

    try {
      await addChatMessage({
        chatThreadId: chatThreadId,
        email: currentUserEmail,
        text: trimmedMessage,
      })

      const otherEmail = need.requesterEmail === currentUserEmail ? need.professionalEmail : need.requesterEmail
      if (otherEmail) {
        await createNotificationViaAPI({
          userEmail: otherEmail,
          title: "Nova mensagem",
          message: `Você recebeu uma nova mensagem sobre "${need.title}"`,
          type: "message",
          needId: need.id,
        }).catch((err) => console.error("[v0] Failed to create message notification:", err))
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      })
      setNewMessage(trimmedMessage)
    } finally {
      setIsSending(false)
    }
  }

  const otherUserEmail = need.requesterEmail === currentUserEmail ? need.professionalEmail : need.requesterEmail
  const isOtherUserProfessional = need.professionalEmail === otherUserEmail
  const otherUserRole = isOtherUserProfessional ? "Profissional" : "Solicitante"

  const otherUserFirstName = otherUserProfile?.fullName ? otherUserProfile.fullName.split(" ")[0] : "Carregando..."

  const serviceImage = need.images?.[0] || null

  const isProfessional = chatThreadProfessionalEmail === currentUserEmail

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] flex flex-col h-[80vh]">
          <DialogTitle className="sr-only">Chat com {otherUserFirstName}</DialogTitle>
          <div className="flex items-start gap-3 pb-4 border-b">
            <Avatar className="h-12 w-12 flex-shrink-0">
              {serviceImage ? <AvatarImage src={serviceImage || "/placeholder.svg"} alt={need.title} /> : null}
              <AvatarFallback className="bg-muted">
                <MessageCircle className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-base font-semibold">{otherUserFirstName}</span>
                <span className="text-muted-foreground text-sm">•</span>
                <span className="text-sm font-medium text-primary truncate">{need.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{otherUserRole}</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div
              ref={scrollAreaViewportRef}
              className="h-full p-4 border rounded-md bg-gray-50 dark:bg-gray-900 overflow-y-auto scrollbar-thin"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgb(209 213 219) transparent",
              }}
            >
              {isLoading ? (
                <p className="text-center text-gray-500 dark:text-gray-400">Carregando mensagens...</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {isLoadingMore && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    </div>
                  )}
                  {hasMoreMessages && !isLoadingMore && messages.length >= MESSAGES_PER_PAGE && (
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-2">
                      Role para cima para carregar mensagens antigas
                    </div>
                  )}
                  <div ref={messagesStartRef} />
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">
                      Nenhuma mensagem ainda. Comece a conversar!
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col rounded-lg max-w-[80%]",
                          msg.type === "system"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 self-center text-center text-sm italic p-2"
                            : msg.type === "bid"
                              ? "self-start w-full max-w-full"
                              : msg.email === currentUserEmail
                                ? "bg-blue-500 dark:bg-blue-600 text-white self-end p-2"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 self-start p-2",
                        )}
                      >
                        {msg.type === "bid" ? (
                          <div
                            className={cn(
                              "border-2 rounded-lg p-3",
                              msg.metadata?.status === "accepted"
                                ? "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700"
                                : msg.metadata?.status === "declined" || msg.metadata?.status === "cancelled"
                                  ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60"
                                  : "bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-700",
                            )}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">💰</span>
                              <span className="font-semibold text-sm">
                                {msg.metadata?.status === "accepted"
                                  ? "Proposta Aceita!"
                                  : msg.metadata?.status === "declined"
                                    ? "Proposta Recusada"
                                    : msg.metadata?.status === "cancelled"
                                      ? "Proposta Cancelada"
                                      : "Proposta de Valor"}
                              </span>
                            </div>

                            {msg.metadata?.status !== "cancelled" && msg.metadata?.bidAmount && (
                              <>
                                <div className="space-y-2 mb-3">
                                  <div className="flex items-center justify-between text-sm pb-2 border-b border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-600 dark:text-gray-400">Valor do lance:</span>
                                    <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                                      {formatCurrency(msg.metadata.bidAmount)}
                                    </span>
                                  </div>

                                  <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                    Sem taxas ou comissões para assinantes
                                  </div>
                                </div>

                                {msg.metadata?.status === "pending" && msg.email !== currentUserEmail && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="flex-1 bg-green-600 hover:bg-green-700"
                                      onClick={async () => {
                                        console.log("[v0] Aceitar clicked. proposalId:", msg.metadata?.proposalId)
                                        try {
                                          if (msg.metadata?.proposalId) {
                                            await acceptProposal(msg.metadata.proposalId, need.id, currentUserEmail)
                                            toast({
                                              title: "Proposta aceita!",
                                              description: "O serviço está pronto para ser executado.",
                                            })

                                            const updatedThread = await getChatThreadById(chatThreadId)
                                            if (updatedThread) {
                                              setMessages(updatedThread.messages || [])
                                            }
                                          }
                                        } catch (error) {
                                          console.error("Error accepting proposal:", error)
                                          toast({
                                            title: "Erro ao aceitar proposta",
                                            description: "Tente novamente mais tarde.",
                                            variant: "destructive",
                                          })
                                        }
                                      }}
                                    >
                                      Aceitar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 border-red-500 text-red-600 hover:bg-red-50 bg-transparent"
                                      onClick={async () => {
                                        try {
                                          if (msg.metadata?.proposalId) {
                                            await declineProposal(msg.metadata.proposalId)
                                            toast({
                                              title: "Proposta recusada",
                                              description: "O profissional foi notificado.",
                                            })

                                            const updatedThread = await getChatThreadById(chatThreadId)
                                            if (updatedThread) {
                                              setMessages(updatedThread.messages || [])
                                            }
                                          }
                                        } catch (error) {
                                          console.error("Error declining proposal:", error)
                                          toast({
                                            title: "Erro ao recusar proposta",
                                            description: "Tente novamente mais tarde.",
                                            variant: "destructive",
                                          })
                                        }
                                      }}
                                    >
                                      Recusar
                                    </Button>
                                  </div>
                                )}

                                {msg.metadata?.status === "accepted" && (
                                  <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                                    Serviço pronto para ser executado
                                  </div>
                                )}
                              </>
                            )}

                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 block">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ) : (
                          <>
                            {msg.type === "user" && (
                              <span className="text-xs font-semibold mb-1">
                                {msg.email === currentUserEmail
                                  ? "Você"
                                  : userNames[msg.email || ""] || msg.email?.split("@")[0]}
                              </span>
                            )}
                            <p>{msg.text}</p>
                            <span
                              className={cn(
                                "text-xs mt-1",
                                msg.email === currentUserEmail
                                  ? "text-blue-100 dark:text-blue-200"
                                  : "text-gray-500 dark:text-gray-400",
                              )}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>
          {isProfessional && need.status === "aberto" && (
            <div className="pt-2">
              <Button
                onClick={() => setShowSendBidDialog(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                💰 Enviar Lance
              </Button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex gap-2 pt-4">
            <Input
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending}
            />
            <Button type="submit" disabled={isSending}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {showSendBidDialog && (
        <SendBidDialog
          need={need}
          isOpen={showSendBidDialog}
          onClose={() => setShowSendBidDialog(false)}
          currentUserEmail={currentUserEmail}
          onSuccess={() => {
            setShowSendBidDialog(false)
          }}
        />
      )}
    </>
  )
}
