import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/push/subscribe
 * Subscribe user to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const { subscription, email } = await request.json()

    if (!subscription || !email) {
      return NextResponse.json(
        { error: "Subscription and email are required" },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    )

    // Save subscription to database
    const { error } = await supabase.from("push_subscriptions").insert({
      user_email: email,
      endpoint: subscription.endpoint,
      auth: subscription.keys.auth,
      p256dh: subscription.keys.p256dh,
    })

    if (error) {
      // If it's a unique constraint error, update the existing subscription
      if (error.code === "23505") {
        await supabase
          .from("push_subscriptions")
          .update({
            auth: subscription.keys.auth,
            p256dh: subscription.keys.p256dh,
            updated_at: new Date().toISOString(),
          })
          .eq("endpoint", subscription.endpoint)
      } else {
        throw error
      }
    }

    console.log("[v0] Push subscription saved for:", email)

    return NextResponse.json({
      success: true,
      message: "Subscribed to push notifications",
    })
  } catch (error: any) {
    console.error("[v0] Push subscription error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to subscribe" },
      { status: 500 }
    )
  }
}
