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
