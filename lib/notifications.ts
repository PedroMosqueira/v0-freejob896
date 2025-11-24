"use client"

// Client-side notification manager for browser notifications

export type NotificationType = "proposal" | "message" | "acceptance" | "completion" | "cancellation"

export interface NotificationOptions {
  title: string
  body: string
  type: NotificationType
  needId?: string
  proposalId?: string
  icon?: string
  badge?: string
  tag?: string
}

class NotificationManager {
  private static instance: NotificationManager
  private permission: NotificationPermission = "default"

  private constructor() {
    if (typeof window !== "undefined" && "Notification" in window) {
      this.permission = Notification.permission
    }
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.log("[v0] Notifications not supported")
      return false
    }

    if (this.permission === "granted") {
      return true
    }

    try {
      this.permission = await Notification.requestPermission()
      console.log("[v0] Notification permission:", this.permission)
      return this.permission === "granted"
    } catch (error) {
      console.error("[v0] Error requesting notification permission:", error)
      return false
    }
  }

  async show(options: NotificationOptions): Promise<void> {
    console.log("[v0] Attempting to show notification:", options)

    // Check if permission is granted
    if (this.permission !== "granted") {
      const granted = await this.requestPermission()
      if (!granted) {
        console.log("[v0] Notification permission not granted")
        return
      }
    }

    try {
      // Check if service worker is available
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        console.log("[v0] Using service worker for notification")
        // Use service worker to show notification
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || "/images/logo.png",
          badge: options.badge || "/images/logo.png",
          tag: options.tag || `freejob-${options.type}-${Date.now()}`,
          vibrate: [200, 100, 200],
          data: {
            type: options.type,
            needId: options.needId,
            proposalId: options.proposalId,
            url: options.needId ? `/need/${options.needId}` : "/",
          },
          actions: [
            { action: "open", title: "Ver Agora" },
            { action: "close", title: "Fechar" },
          ],
        })
        console.log("[v0] Service worker notification shown")
      } else {
        console.log("[v0] Using direct notification API")
        // Fallback to direct notification
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || "/images/logo.png",
          badge: options.badge || "/images/logo.png",
          tag: options.tag || `freejob-${options.type}-${Date.now()}`,
          data: {
            type: options.type,
            needId: options.needId,
            proposalId: options.proposalId,
          },
        })

        // Handle click
        notification.onclick = () => {
          console.log("[v0] Notification clicked")
          window.focus()
          if (options.needId) {
            window.location.href = `/need/${options.needId}`
          }
          notification.close()
        }

        console.log("[v0] Direct notification shown")
      }
    } catch (error) {
      console.error("[v0] Error showing notification:", error)
    }
  }

  // Convenience methods for common notification types
  async showProposalReceived(needTitle: string, needId: string, proposalId: string): Promise<void> {
    await this.show({
      title: "Nova proposta recebida",
      body: `Você recebeu uma nova proposta para "${needTitle}"`,
      type: "proposal",
      needId,
      proposalId,
    })
  }

  async showProposalAccepted(needTitle: string, needId: string, proposalId: string): Promise<void> {
    await this.show({
      title: "Proposta aceita!",
      body: `Sua proposta para "${needTitle}" foi aceita`,
      type: "acceptance",
      needId,
      proposalId,
    })
  }

  async showNewMessage(senderName: string, needTitle: string, needId: string): Promise<void> {
    await this.show({
      title: `Nova mensagem de ${senderName}`,
      body: `Em: ${needTitle}`,
      type: "message",
      needId,
    })
  }

  async showServiceCompleted(needTitle: string, needId: string): Promise<void> {
    await this.show({
      title: "Serviço concluído",
      body: `O serviço "${needTitle}" foi marcado como concluído`,
      type: "completion",
      needId,
    })
  }

  async showServiceCancelled(needTitle: string, needId: string): Promise<void> {
    await this.show({
      title: "Serviço cancelado",
      body: `O serviço "${needTitle}" foi cancelado`,
      type: "cancellation",
      needId,
    })
  }
}

export const notificationManager = NotificationManager.getInstance()

// Auto-request permission on first interaction
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    // Request permission after 2 seconds to not interrupt page load
    setTimeout(() => {
      notificationManager.requestPermission()
    }, 2000)
  })
}
