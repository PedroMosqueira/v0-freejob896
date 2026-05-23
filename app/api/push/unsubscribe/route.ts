import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/push/unsubscribe
 * Unsubscribe user from push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const { endpoint, email } = await request.json()

    if (!endpoint || !email) {
      return NextResponse.json(
        { error: "Endpoint and email are required" },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    )

    // Delete subscription from database
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_email", email)

    if (error) {
      throw error
    }

    console.log("[v0] Push subscription removed for:", email)

    return NextResponse.json({
      success: true,
      message: "Unsubscribed from push notifications",
    })
  } catch (error: any) {
    console.error("[v0] Push unsubscribe error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to unsubscribe" },
      { status: 500 }
    )
  }
}
