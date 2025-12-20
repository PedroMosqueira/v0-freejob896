"use client"

import { createClient } from "@/lib/supabase/client"

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  related_need_id?: string
  related_proposal_id?: string
  created_at: string
  updated_at: string
}

export async function getNotifications(userEmail: string): Promise<Notification[]> {
  console.log("[v0] getNotifications chamado com userEmail:", userEmail)
  const supabase = createClient()

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userEmail)
    .order("created_at", { ascending: false })

  console.log("[v0] getNotifications resultado:", { data, error })

  if (error) {
    console.error("Error fetching notifications:", error)
    return []
  }

  return data || []
}

export async function getUnreadCount(userEmail: string): Promise<number> {
  console.log("[v0] getUnreadCount chamado com userEmail:", userEmail)
  const supabase = createClient()

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userEmail)
    .eq("is_read", false)

  console.log("[v0] getUnreadCount resultado:", { count, error })

  if (error) {
    console.error("Error fetching unread count:", error)
    return 0
  }

  return count || 0
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq("id", notificationId)

  if (error) {
    console.error("Error marking notification as read:", error)
    return false
  }

  return true
}

export async function markAllAsRead(userEmail: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq("user_id", userEmail)
    .eq("is_read", false)

  if (error) {
    console.error("Error marking all notifications as read:", error)
    return false
  }

  return true
}

export async function createNotification(
  userEmail: string,
  title: string,
  message: string,
  type: string,
  relatedNeedId?: string,
  relatedProposalId?: string,
): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase.from("notifications").insert({
    user_id: userEmail,
    title,
    message,
    type,
    is_read: false,
    related_need_id: relatedNeedId,
    related_proposal_id: relatedProposalId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error("Error creating notification:", error)
    return false
  }

  return true
}
