import { NextRequest, NextResponse } from "next/server"
import { sendPushToUser } from "@/lib/push-notifications-server"

/**
 * POST /api/push/send
 * Send push notification to a user
 * This is called internally when creating notifications
 */
export async function POST(request: NextRequest) {
  try {
    const { email, title, body, icon, data } = await request.json()

    if (!email || !title || !body) {
      return NextResponse.json(
        { error: "Email, title, and body are required" },
        { status: 400 }
      )
    }

    // Send push to all subscriptions of the user
    const result = await sendPushToUser(email, {
      title,
      body,
      icon,
      data,
    })

    if (!result.success) {
      throw new Error("Failed to send push notification")
    }

    console.log(`[v0] Push notification sent to ${result.sent} subscription(s) for ${email}`)

    return NextResponse.json({
      success: true,
      sent: result.sent,
    })
  } catch (error: any) {
    console.error("[v0] Push send error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to send push notification" },
      { status: 500 }
    )
  }
}
