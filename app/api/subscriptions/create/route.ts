import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSubscriptionCheckoutSession } from "@/lib/stripe"
import { getProductBySlug } from "@/lib/stripe-products"
import { PAID_SUBSCRIPTION_STATUSES } from "@/lib/subscription-status"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] POST /api/subscriptions/create called")
    const body = await request.json()
    const { planSlug, billingCycle, needId } = body

    const authClient = await createSupabaseServerClient()
    const {
      data: { user: sessionUser },
    } = await authClient.auth.getUser()
    if (!sessionUser?.email) {
      return NextResponse.json({ error: "Entre na sua conta para assinar um plano." }, { status: 401 })
    }
    // The checkout is always for the logged-in account, never an email sent by the browser.
    const email = sessionUser.email
    const pendingNeedId =
      typeof needId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(needId) ? needId : null

    console.log("[v0] Request body:", { email, planSlug, billingCycle })

    if (!email || !planSlug || !billingCycle) {
      console.warn("[v0] Missing required fields")
      return NextResponse.json(
        { error: "Missing required fields: email, planSlug, billingCycle" },
        { status: 400 }
      )
    }

    console.log("[v0] Creating subscription:", { email, planSlug, billingCycle })

    const supabase = await createSupabaseServerClient()
    console.log("[v0] Supabase client created")

    // Validate user exists
    // users has no subscription_plan column; selecting it made this query fail
    // and returned a misleading 404. Paid-plan status lives in user_subscriptions.
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle()

    console.log("[v0] User lookup result:", { user: user?.id, error: userError?.message })

    if (userError) {
      console.error("[v0] User lookup failed:", userError)
      return NextResponse.json({ error: "Não foi possível verificar sua conta." }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    // Nunca iniciar uma nova cobrança para quem já tem plano pago ativo.
    const { data: activeSubscription } = await supabase
      .from("user_subscriptions")
      .select("id, current_period_end, subscription_plans(slug)")
      .eq("user_id", user.id)
      .in("status", [...PAID_SUBSCRIPTION_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeSubscription) {
      const expiresAt = activeSubscription.current_period_end ? new Date(activeSubscription.current_period_end) : null
      if (!expiresAt || expiresAt > new Date()) {
        return NextResponse.json(
          { error: "Você já possui um plano ativo.", code: "ACTIVE_PLAN" },
          { status: 409 },
        )
      }
    }

    // Validate plan exists
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, slug")
      .eq("slug", planSlug)
      .single()

    console.log("[v0] Plan lookup result:", { plan: plan?.id, error: planError?.message })

    if (planError || !plan) {
      console.error("[v0] Plan not found:", planError)
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    // Get product details for Stripe
    console.log("[v0] Getting product by slug:", planSlug)
    const product = getProductBySlug(planSlug)
    console.log("[v0] Product found:", product?.id)
    
    if (!product) {
      console.error("[v0] Product not found in catalog:", planSlug)
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Get base URL for redirect
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    
    // Validate base URL
    if (!baseUrl || baseUrl.trim() === '') {
      console.warn("[v0] NEXT_PUBLIC_SITE_URL is not set, attempting to use request origin")
      // Use request origin as fallback
      const requestUrl = request.nextUrl.clone()
      baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    }
    
    // Final validation - ensure URL has scheme
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`
    }
    
    console.log("[v0] Base URL:", baseUrl)
    
    // Create Stripe checkout session
    console.log("[v0] Calling createSubscriptionCheckoutSession with product:", product.id)
    const needQuery = pendingNeedId ? `&need=${encodeURIComponent(pendingNeedId)}` : ""
    // Canceling returns the user to the need they were looking at.
    const cancelUrl = pendingNeedId
      ? `${baseUrl}/?needId=${encodeURIComponent(pendingNeedId)}`
      : `${baseUrl}/planos?canceled=true`

    const session = await createSubscriptionCheckoutSession(
      product.id,
      email,
      `${baseUrl}/planos?session_id={CHECKOUT_SESSION_ID}${needQuery}`,
      cancelUrl,
      {
        userEmail: email,
        planId: planSlug,
      }
    )

    console.log("[v0] Stripe checkout session created:", session.id)

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      message: "Redirecting to payment",
    })
  } catch (error) {
    console.error("[v0] Error in subscriptions create API:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    console.error("[v0] Error details:", { message: errorMessage, stack: error instanceof Error ? error.stack : "" })
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

