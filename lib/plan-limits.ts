export type PlanType = 'free' | 'basico' | 'pro'

export interface PlanLimits {
  pedidos_por_mes: number // -1 = ilimitado
  interesses_por_mes: number // -1 = ilimitado
  mostrar_video_ads: boolean
  mostrar_banner_ads: boolean
  badge_label: string
  badge_color: string
  prioridade_busca: boolean
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    pedidos_por_mes: 3,
    interesses_por_mes: 5,
    mostrar_video_ads: true,
    mostrar_banner_ads: true,
    badge_label: '',
    badge_color: '',
    prioridade_busca: false,
  },
  basico: {
    pedidos_por_mes: 15,
    interesses_por_mes: 25,
    mostrar_video_ads: false,
    mostrar_banner_ads: true,
    badge_label: 'Básico',
    badge_color: 'blue',
    prioridade_busca: false,
  },
  pro: {
    pedidos_por_mes: -1, // ilimitado
    interesses_por_mes: -1, // ilimitado
    mostrar_video_ads: false,
    mostrar_banner_ads: false,
    badge_label: 'Pro',
    badge_color: 'yellow',
    prioridade_busca: true,
  },
}

// Prazos em horas
export const DEADLINES = {
  CLIENT_VIEW_HOURS: 24, // Cliente tem 24h para visualizar chat
  PROFESSIONAL_BID_HOURS: 48, // Profissional tem 48h para enviar lance
  CLIENT_RESPONSE_HOURS: 48, // Cliente tem 48h para aceitar/recusar
  AUTO_CONFIRM_HOURS: 24, // Auto-confirmar conclusão após 24h
}

export function canPerformAction(
  userPlan: PlanType,
  action: 'pedido' | 'interesse',
  creditsUsed: number
): { allowed: boolean; limit: number; remaining: number } {
  const limits = PLAN_LIMITS[userPlan]
  const limit = action === 'pedido' ? limits.pedidos_por_mes : limits.interesses_por_mes

  if (limit === -1) {
    return { allowed: true, limit: -1, remaining: -1 }
  }

  const remaining = limit - creditsUsed
  return {
    allowed: remaining > 0,
    limit,
    remaining: Math.max(0, remaining),
  }
}
