import { stripe } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    console.error('[v0] Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[v0] Processing Stripe webhook event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        await handleCheckoutSessionCompleted(session)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        await handleSubscriptionUpdated(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        await handleSubscriptionDeleted(subscription)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        await handleInvoicePaymentSucceeded(invoice)
        break
      }
      default:
        console.log('[v0] Unhandled webhook event type:', event.type)
    }
  } catch (error) {
    console.error('[v0] Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log('[v0] Handling checkout.session.completed:', session.id)

  const supabase = createSupabaseServerClient()

  try {
    // Obter user pelo email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.customer_email)
      .single()

    if (userError || !user) {
      console.error('[v0] User not found for email:', session.customer_email)
      return
    }

    // Obter plano pelo metadata
    const planSlug = session.metadata?.plan_slug
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('slug', planSlug)
      .single()

    if (planError || !plan) {
      console.error('[v0] Plan not found:', planSlug)
      return
    }

    // Atualizar ou criar subscrição
    const now = new Date()
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    const { error: subError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: plan.id,
        status: 'active',
        billing_cycle: 'monthly',
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })

    if (subError) {
      console.error('[v0] Error upserting subscription:', subError)
      return
    }

    // Atualizar cache em users
    await supabase
      .from('users')
      .update({ subscription_plan: planSlug })
      .eq('id', user.id)

    console.log('[v0] Subscription activated for user:', user.id, 'plan:', planSlug)
  } catch (error) {
    console.error('[v0] Error in handleCheckoutSessionCompleted:', error)
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('[v0] Handling customer.subscription.updated:', subscription.id)

  const supabase = createSupabaseServerClient()

  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status === 'active' ? 'active' : 'paused',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('[v0] Error updating subscription:', error)
    } else {
      console.log('[v0] Subscription updated:', subscription.id)
    }
  } catch (error) {
    console.error('[v0] Error in handleSubscriptionUpdated:', error)
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('[v0] Handling customer.subscription.deleted:', subscription.id)

  const supabase = createSupabaseServerClient()

  try {
    // Marcar como cancelada
    const { data: sub, error: getError } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (getError || !sub) {
      console.error('[v0] Subscription not found')
      return
    }

    await supabase
      .from('user_subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', subscription.id)

    // Resetar plano para free em users
    await supabase
      .from('users')
      .update({ subscription_plan: 'free' })
      .eq('id', sub.user_id)

    console.log('[v0] Subscription canceled:', subscription.id)
  } catch (error) {
    console.error('[v0] Error in handleSubscriptionDeleted:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log('[v0] Handling invoice.payment_succeeded:', invoice.id)
  // Aqui você pode registrar o pagamento, enviar email, etc
  // Por enquanto apenas logamos
}
