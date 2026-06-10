'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { stripe, createSubscriptionCheckoutSession } from '@/lib/stripe'
import { redirect } from 'next/navigation'

export async function startSubscriptionCheckout(
  productId: string,
  userEmail: string,
) {
  console.log('[v0] Starting subscription checkout for:', userEmail, productId)

  try {
    // Validar que o usuário existe
    const supabase = await createSupabaseServerClient()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', userEmail)
      .single()

    if (userError || !user) {
      throw new Error('Usuário não encontrado')
    }

    // Cancelar qualquer inscrição ativa anterior
    console.log('[v0] Checking for existing active subscriptions...')
    const { data: existingSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (existingSubscriptions && existingSubscriptions.length > 0) {
      console.log('[v0] Found', existingSubscriptions.length, 'active subscription(s). Canceling them...')
      
      // Cancelar cada inscrição ativa no Stripe e no banco
      for (const sub of existingSubscriptions) {
        if (sub.stripe_subscription_id) {
          try {
            await stripe.subscriptions.cancel(sub.stripe_subscription_id)
            console.log('[v0] Canceled Stripe subscription:', sub.stripe_subscription_id)
          } catch (stripeError) {
            console.error('[v0] Error canceling Stripe subscription:', stripeError)
          }
        }
        
        // Atualizar status no banco para 'cancelled'
        await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', sub.id)
      }
    }

    // Criar sessão de checkout
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const session = await createSubscriptionCheckoutSession(
      productId,
      userEmail,
      `${baseUrl}/planos?session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/planos?canceled=true`,
    )

    console.log('[v0] Checkout session created:', session.id)

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    }
  } catch (error) {
    console.error('[v0] Error creating checkout session:', error)
    throw error
  }
}
