"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

interface CreateNotificationParams {
  user_id: string
  title: string
  message: string
  type: "proposal" | "message" | "acceptance" | "completion"
  related_need_id?: string
  related_proposal_id?: string
}

export async function createNotificationRecord(params: CreateNotificationParams) {
  const supabase = await createSupabaseServerClient()

  console.log("[v0] Creating notification:", params)

  const { data, error } = await supabase.from("notifications").insert({
    user_id: params.user_id,
    title: params.title,
    message: params.message,
    type: params.type,
    related_need_id: params.related_need_id,
    related_proposal_id: params.related_proposal_id,
    is_read: false,
  })

  if (error) {
    console.error("[v0] Error creating notification:", error)
    return { success: false, error }
  }

  console.log("[v0] Notification created successfully")
  return { success: true, data }
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)

  if (error) {
    console.error("[v0] Error marking notification as read:", error)
    return { success: false, error }
  }

  return { success: true }
}
