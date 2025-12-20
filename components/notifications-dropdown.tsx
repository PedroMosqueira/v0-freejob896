"use client"

import { useState, useEffect } from "react"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type Notification,
} from "@/lib/notifications-store"
import { useNotifications } from "@/hooks/use-notifications"
import { useRouter } from "next/navigation"

interface NotificationsDropdownProps {
  userEmail: string
}

export default function NotificationsDropdown({ userEmail }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useNotifications()

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        await loadNotifications()
        await loadUnreadCount()
      } catch (error) {
        console.error("Error during initial load:", error)
      }
    }

    initializeNotifications()

    const interval = setInterval(() => {
      loadNotifications()
      loadUnreadCount()
    }, 10000)

    const handleNewNotification = () => {
      loadNotifications()
      loadUnreadCount()
    }

    window.addEventListener("new-notification", handleNewNotification)

    return () => {
      clearInterval(interval)
      window.removeEventListener("new-notification", handleNewNotification)
    }
  }, [userEmail])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await getNotifications(userEmail)
      setNotifications(data)
    } catch (error) {
      console.error("Error loading notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount(userEmail)
      setUnreadCount(count)
    } catch (error) {
      console.error("Error loading unread count:", error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId)
    await loadNotifications()
    await loadUnreadCount()
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(userEmail)
    await loadNotifications()
    await loadUnreadCount()
  }

  const handleToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      loadNotifications()
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    await handleMarkAsRead(notification.id)
    setIsOpen(false)

    if (notification.related_need_id) {
      const event = new CustomEvent("openNeed", { detail: notification.related_need_id })
      window.dispatchEvent(event)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "proposal":
        return "💼" // Lance/Proposta recebida
      case "proposal_accepted":
        return "✅" // Proposta aceita
      case "proposal_rejected":
        return "❌" // Proposta recusada
      case "message":
        return "💬" // Nova mensagem
      case "new_message":
        return "💬" // Nova mensagem (alternativo)
      case "status":
        return "📋" // Mudança de status
      case "status_change":
        return "🔄" // Mudança de status (alternativo)
      case "completion":
        return "✅" // Serviço concluído
      case "completed":
        return "🎉" // Serviço concluído (alternativo)
      case "interest":
        return "⭐" // Interesse demonstrado
      case "visit":
        return "📅" // Visita agendada
      case "cancellation":
        return "🚫" // Cancelamento
      case "cancelled":
        return "🚫" // Cancelamento (alternativo)
      default:
        return "🔔" // Notificação genérica
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Agora"
    if (diffMins < 60) return `${diffMins}m atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    if (diffDays < 7) return `${diffDays}d atrás`
    return date.toLocaleDateString("pt-BR")
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 sm:h-10 sm:w-10 text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:text-white dark:hover:bg-gray-700"
        onClick={handleToggle}
      >
        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 sm:top-1 sm:right-1 h-2 w-2 rounded-full bg-red-500" />
        )}
        <span className="sr-only">Notificações</span>
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed sm:absolute right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] max-w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notificações</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>

            <ScrollArea className="h-96">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Carregando...</div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                        !notification.is_read ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                            {!notification.is_read && (
                              <span className="ml-2 h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  )
}
