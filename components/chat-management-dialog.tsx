"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { listChatThreadsForNeed, type Need, type ChatThread } from "@/lib/needs-store"
import { useToast } from "@/hooks/use-toast"
import ChatDialog from "@/components/chat-dialog"
import { MessageCircle } from "lucide-react"
import { formatUserName } from "@/lib/format-user-name"
import { getUserProfile } from "@/lib/user-profile"

interface ChatManagementDialogProps {
  need: Need
  isOpen: boolean
  onClose: () => void
  currentUserEmail: string
  onChatActionSuccess?: () => void // Made optional to prevent errors
}

export { ChatManagementDialog }
export default ChatManagementDialog

function ChatManagementDialog({
  need,
  isOpen,
  onClose,
  currentUserEmail,
  onChatActionSuccess,
}: ChatManagementDialogProps) {
  const { toast } = useToast()
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([])
  const [isLoadingThreads, setIsLoadingThreads] = useState(true)
  const [selectedChatThread, setSelectedChatThread] = useState<ChatThread | null>(null)
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({})
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string>("")

  const isRequester = need.requesterEmail === currentUserEmail

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

  useEffect(() => {
    async function fetchChatThreads() {
      if (!isOpen) return

      setIsLoadingThreads(true)
      try {
        const threads = await listChatThreadsForNeed(need.id, currentUserEmail)
        setChatThreads(threads)

        const emails = [...new Set(threads.flatMap((t) => [t.requesterEmail, t.professionalEmail]))]
        const profiles: Record<string, string> = {}

        for (const email of emails) {
          try {
            const { getUserProfile } = await import("@/lib/user-profile")
            const profile = await getUserProfile(email)
            profiles[email] = formatUserName(profile)
          } catch (error) {
            profiles[email] = formatUserName(null, email)
          }
        }

        setUserProfiles(profiles)

        if (!isRequester && threads.length > 0) {
          setSelectedChatThread(threads[0])
        }
      } catch (error) {
        console.error("Erro ao buscar threads de chat:", error)
        toast({
          title: "Erro ao carregar chats",
          description: "Não foi possível carregar as conversas para este serviço.",
          variant: "destructive",
        })
        setChatThreads([])
      } finally {
        setIsLoadingThreads(false)
      }
    }

    fetchChatThreads()
  }, [isOpen, need.id, currentUserEmail, isRequester, toast])

  const handleOpenSpecificChat = (thread: ChatThread) => {
    setSelectedChatThread(thread)
  }

  const handleCloseChatDialog = () => {
    setSelectedChatThread(null)
    onChatActionSuccess?.() // Added optional chaining to safely call the function
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

  if (selectedChatThread) {
    return (
      <ChatDialog
        need={need}
        isOpen={true}
        onClose={handleCloseChatDialog}
        currentUserEmail={currentUserEmail}
        chatThreadId={selectedChatThread.id}
      />
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] flex flex-col h-[80vh] bg-background border-0 shadow-none p-0">
        <DialogTitle className="sr-only">Gerenciar Conversas do Serviço</DialogTitle>

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
            <h2 className="text-lg font-semibold text-left">Conversas do Serviço</h2>
            <p className="text-sm text-muted-foreground text-left truncate">{need.title}</p>
          </div>
        </div>
        <ScrollArea className="flex-1 p-0 overflow-y-auto">
          {isLoadingThreads ? (
            <p className="text-center text-muted-foreground py-4">Carregando conversas...</p>
          ) : chatThreads.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {isRequester
                ? "Nenhum profissional iniciou um chat para este serviço ainda."
                : "Você ainda não iniciou um chat para este serviço."}
            </p>
          ) : (
            <div className="grid gap-0">
              {chatThreads.map((thread) => {
                const otherUserEmail = isRequester ? thread.professionalEmail : thread.requesterEmail
                const otherUserName = userProfiles[otherUserEmail] || otherUserEmail.split("@")[0]
                const lastMessage =
                  thread.messages && thread.messages.length > 0 ? thread.messages[thread.messages.length - 1] : null
                const messageText = lastMessage ? lastMessage.text || lastMessage.content || "" : ""
                const serviceImage = need?.images?.[0] || need?.imageUrl || null

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
                          alt={need.title}
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
                        <p className="text-sm font-medium text-primary truncate">{need.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{isRequester ? "Profissional" : "Solicitante"}</p>
                      {messageText ? (
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
