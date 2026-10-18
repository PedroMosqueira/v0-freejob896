import webpush from "web-push"
import { createClient } from "@supabase/supabase-js"

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: { url?: string } & Record<string, unknown>
}

let configured: boolean | null = null

function configureWebPush(): boolean {
  if (configured !== null) return configured
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    configured = false
    return false
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contato@freejob.services", publicKey, privateKey)
  configured = true
  return true
}

export function buildNotificationUrl(needId?: string | null): string {
  return needId ? `/?needId=${encodeURIComponent(needId)}` : "/"
}

export async function sendPushToUser(email: string, payload: PushPayload): Promise<{ sent: number }> {
  if (!email || !configureWebPush()) return { sent: 0 }

  const admin = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { persistSession: false } },
  )

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, auth, p256dh")
    .eq("user_email", email.toLowerCase())

  if (error || !subscriptions?.length) return { sent: 0 }

  const body = JSON.stringify(payload)
  const expired: string[] = []
  let sent = 0

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          body,
          { TTL: 60 * 60 * 24, urgency: "high" },
        )
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) expired.push(sub.id)
        else console.error("[push] Send failed:", status, (err as Error).message)
      }
    }),
  )

  if (expired.length) await admin.from("push_subscriptions").delete().in("id", expired)
  return { sent }
}

// Never let a push failure break the action that created the notification.
export async function safeSendPush(email: string, payload: PushPayload) {
  try {
    await sendPushToUser(email, payload)
  } catch (error) {
    console.error("[push] Unexpected error:", error)
  }
}
