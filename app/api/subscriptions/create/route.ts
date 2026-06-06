import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, planSlug, billingCycle } = body

    if (!email || !planSlug || !billingCycle) {
      return NextResponse.json(
        { error: "Missing required fields: email, planSlug, billingCycle" },
        { status: 400 }
      )
    }

    console.log("[v0] Creating subscription:", { email, planSlug, billingCycle })

    const supabase = createSupabaseServerClient()

    // Get user ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (userError || !user) {
      console.error("[v0] User not found:", userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get plan ID
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, stripe_price_id_monthly, stripe_price_id_annual")
      .eq("slug", planSlug)
      .single()

    if (planError || !plan) {
      console.error("[v0] Plan not found:", planError)
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    // Calculate period dates
    const now = new Date()
    const currentPeriodEnd = new Date()
    if (billingCycle === "monthly") {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
    } else {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1)
    }

    // Create subscription in database
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        status: "active",
        billing_cycle: billingCycle,
        current_period_start: now.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
      })
      .select("id")
      .single()

    if (subError) {
      console.error("[v0] Error creating subscription:", subError)
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500 }
      )
    }

    // Update user's subscription_plan cache
    await supabase
      .from("users")
      .update({ subscription_plan: planSlug })
      .eq("id", user.id)

    console.log("[v0] Subscription created successfully:", subscription.id)

    // TODO: If you have Stripe integration, redirect to checkout
    // For now, return success - this is for testing without payment
    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      message: "Subscription created successfully",
    })
  } catch (error) {
    console.error("[v0] Error in subscriptions create API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
