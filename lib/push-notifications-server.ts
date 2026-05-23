import webpush from "web-push"

/**
 * Get VAPID keys from environment variables
 * If not configured, returns null (push notifications will be disabled)
 */
export function getVAPIDKeys() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    console.warn(
      "[v0] Push notifications not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables."
    )
    return null
  }

  return { publicKey, privateKey }
}

/**
 * Configure web-push with VAPID keys and subject
 */
export function configureWebPush() {
  const keys = getVAPIDKeys()
  if (!keys) return false

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@freejob.online",
    keys.publicKey,
    keys.privateKey
  )

  return true
}

/**
 * Send push notification to a subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
) {
  try {
    configureWebPush()

    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return { success: true }
  } catch (error: any) {
    console.error("[v0] Failed to send push notification:", error.message)

    // If subscription is invalid or expired, it might be a 410 or 404
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, shouldDelete: true }
    }

    return { success: false, shouldDelete: false }
  }
}

/**
 * Send push notification to all subscriptions for a user
 */
export async function sendPushToUser(email: string, payload: PushPayload) {
  const { createClient } = await import("@supabase/supabase-js")

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  )

  // Get all subscriptions for user
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_email", email)

  if (error) {
    console.error("[v0] Failed to fetch push subscriptions:", error.message)
    return { success: false, sent: 0 }
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { success: true, sent: 0 }
  }

  // Send to all subscriptions
  let sent = 0
  const toDelete = []

  for (const sub of subscriptions) {
    const result = await sendPushNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.auth,
          p256dh: sub.p256dh,
        },
      } as PushSubscription,
      payload
    )

    if (result.success) {
      sent++
    }

    if (result.shouldDelete) {
      toDelete.push(sub.id)
    }
  }

  // Delete invalid subscriptions
  if (toDelete.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", toDelete)
  }

  return { success: true, sent }
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, any>
}

export interface PushSubscription {
  endpoint: string
  keys: {
    auth: string
    p256dh: string
  }
}
