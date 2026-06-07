import { createSupabaseServerClient } from "@/lib/supabase/server"
import { startSubscriptionCheckout } from "@/app/actions/stripe-checkout"
import { getProductBySlug } from "@/lib/stripe-products"
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

    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (userError || !user) {
      console.error("[v0] User not found:", userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Validate plan exists
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, slug")
      .eq("slug", planSlug)
      .single()

    if (planError || !plan) {
      console.error("[v0] Plan not found:", planError)
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    // Get product details for Stripe
    const product = getProductBySlug(planSlug)
    if (!product) {
      console.error("[v0] Product not found in catalog:", planSlug)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Create Stripe checkout session
    const checkoutResult = await startSubscriptionCheckout(
      product.id,
      email
    )

    console.log("[v0] Stripe checkout session created:", checkoutResult.sessionId)

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutResult.url,
      sessionId: checkoutResult.sessionId,
      message: "Redirecting to payment",
    })
  } catch (error) {
    console.error("[v0] Error in subscriptions create API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

