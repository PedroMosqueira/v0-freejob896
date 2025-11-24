"use client"

import { useNotifications } from "@/hooks/use-notifications"

export function NotificationListener() {
  useNotifications() // Just call the hook to activate it
  return null // This component doesn't render anything
}
