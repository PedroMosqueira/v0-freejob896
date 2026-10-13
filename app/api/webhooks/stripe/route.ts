import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'

// Stripe calls this route without a user session, so RLS would block every
// read/write with the cookie-based client. Use the service role instead.
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase service role is not configured')
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !secret) {
    console.error('[stripe-webhook] Missing signature header or STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      default:
        break
    }
  } catch (error) {
    // Returning 500 makes Stripe retry the event instead of silently losing it.
    console.error(`[stripe-webhook] Failed to process ${event.type}:`, error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function getPeriod(subscription: Stripe.Subscription) {
  // Newer API versions expose the billing period on subscription items.
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number })
    | undefined
  const legacy = subscription as Stripe.Subscription & {
    current_period_start?: number
    current_period_end?: number
  }
  const start = item?.current_period_start ?? legacy.current_period_start
  const end = item?.current_period_end ?? legacy.current_period_end
  return {
    start: start ? new Date(start * 1000).toISOString() : new Date().toISOString(),
    end: end ? new Date(end * 1000).toISOString() : null,
  }
}

function mapStatus(status: Stripe.Subscription.Status) {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled'
  return 'paused'
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') return

  const email = (session.customer_email || session.customer_details?.email || '').trim().toLowerCase()
  const planSlug = session.metadata?.plan_slug
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

  if (!email || !planSlug || !subscriptionId) {
    throw new Error(
      `Checkout ${session.id} missing data (email: ${Boolean(email)}, plan: ${planSlug}, sub: ${Boolean(subscriptionId)})`,
    )
  }

  const supabase = createAdminClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .ilike('email', email)
    .limit(1)
    .maybeSingle()
  if (userError) throw userError
  if (!user) throw new Error(`User not found for checkout ${session.id}`)

  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('slug', planSlug)
    .maybeSingle()
  if (planError) throw planError
  if (!plan) throw new Error(`Plan not found: ${planSlug}`)

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const period = getPeriod(subscription)

  // user_subscriptions has UNIQUE(user_id): update the user's existing row.
  const { error: subError } = await supabase.from('user_subscriptions').upsert(
    {
      user_id: user.id,
      plan_id: plan.id,
      status: mapStatus(subscription.status),
      billing_cycle: 'monthly',
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId ?? null,
      current_period_start: period.start,
      current_period_end: period.end,
    },
    { onConflict: 'user_id' },
  )
  if (subError) throw subError

  console.log('[stripe-webhook] Subscription activated:', { userId: user.id, plan: planSlug })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()
  const period = getPeriod(subscription)

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: mapStatus(subscription.status),
      current_period_start: period.start,
      current_period_end: period.end,
    })
    .eq('stripe_subscription_id', subscription.id)
  if (error) throw error
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id)
  if (error) throw error
}
