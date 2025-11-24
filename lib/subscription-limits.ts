import { getUserSubscription, PLAN_FEATURES } from './subscription-manager'

export async function checkActionLimit(
  userEmail: string,
  action: 'interest' | 'bid',
  usedThisMonth: number
): Promise<{ allowed: boolean; message?: string; remaining?: number }> {
  console.log('[v0] Checking action limit:', { userEmail, action, usedThisMonth })

  const subscription = await getUserSubscription(userEmail)
  
  if (!subscription) {
    return { allowed: false, message: 'Erro ao verificar plano' }
  }

  const limits = PLAN_FEATURES[subscription.plan].limits
  const limit = action === 'interest' ? limits.interests_per_month : limits.bids_per_month

  // Premium tem limite ilimitado (-1)
  if (limit === -1) {
    return { allowed: true }
  }

  // Verificar se atingiu o limite
  if (usedThisMonth >= limit) {
    return {
      allowed: false,
      message: `Você atingiu o limite de ${limit} ${action === 'interest' ? 'demonstrações de interesse' : 'lances'} por mês. Assine Premium para ter acesso ilimitado!`,
      remaining: 0
    }
  }

  return {
    allowed: true,
    remaining: limit - usedThisMonth
  }
}

export async function shouldShowAds(userEmail: string): Promise<boolean> {
  const subscription = await getUserSubscription(userEmail)
  if (!subscription) return true

  return PLAN_FEATURES[subscription.plan].limits.has_ads
}
