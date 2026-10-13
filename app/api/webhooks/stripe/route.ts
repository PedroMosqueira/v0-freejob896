import { stripe } from '@/lib/stripe'
import {
  activateSubscriptionFromCheckout,
  createAdminClient,
  getSubscriptionPeriod,
  mapSubscriptionStatus,
} from '@/lib/stripe-subscription-sync'
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'

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
        await activateSubscriptionFromCheckout(event.data.object as Stripe.Checkout.Session)
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

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()
  const period = getSubscriptionPeriod(subscription)

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: mapSubscriptionStatus(subscription.status),
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
