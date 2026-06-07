import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Creating test subscription")
    
    const supabase = await createSupabaseServerClient()

    // Get the first user
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .order("created_at", { ascending: true })
      .limit(1)

    if (userError || !users?.length) {
      console.error("[v0] Error fetching user:", userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = users[0]
    console.log("[v0] Found user:", user.email)

    // Get the agencia plan
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("slug", "agencia")
      .single()

    if (planError || !plan) {
      console.error("[v0] Error fetching plan:", planError)
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    console.log("[v0] Found plan:", plan.id)

    // Insert test subscription
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .insert([
        {
          user_id: user.id,
          plan_id: plan.id,
          stripe_customer_id: "cus_test_12345",
          stripe_subscription_id: "sub_test_12345",
          status: "active",
          billing_cycle: "monthly",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
          is_founder: false,
          founder_discount: 0,
        }
      ])
      .select()

    if (subError) {
      console.error("[v0] Error inserting subscription:", subError)
      return NextResponse.json({ error: subError.message }, { status: 500 })
    }

    console.log("[v0] Test subscription created successfully!")
    
    return NextResponse.json({
      success: true,
      message: "Test subscription created",
      subscription: subscription?.[0],
      userEmail: user.email,
    })
  } catch (error) {
    console.error("[v0] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
