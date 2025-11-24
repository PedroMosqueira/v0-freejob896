import { createClient } from '@/lib/supabase/server'
import { PLAN_LIMITS, PlanType, DEADLINES } from './plan-limits'

export async function useCredit(
  userEmail: string,
  needId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Buscar plano e créditos do usuário
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('plan, monthly_credits_used, credits_reset_date')
    .eq('email', userEmail)
    .single()

  if (userError || !user) {
    return { success: false, error: 'Usuário não encontrado' }
  }

  const plan = (user.plan || 'free') as PlanType
  const limits = PLAN_LIMITS[plan]

  // Verificar se precisa resetar créditos (novo mês)
  const resetDate = new Date(user.credits_reset_date)
  const now = new Date()
  const daysSinceReset = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceReset >= 30) {
    // Resetar créditos
    await supabase
      .from('users')
      .update({
        monthly_credits_used: 0,
        credits_reset_date: now.toISOString(),
      })
      .eq('email', userEmail)

    user.monthly_credits_used = 0
  }

  // Verificar limite
  if (limits.interesses_por_mes !== -1 && user.monthly_credits_used >= limits.interesses_por_mes) {
    return {
      success: false,
      error: `Limite de ${limits.interesses_por_mes} manifestações de interesse atingido. Faça upgrade do seu plano.`,
    }
  }

  // Incrementar créditos usados
  const { error: updateError } = await supabase
    .from('users')
    .update({
      monthly_credits_used: user.monthly_credits_used + 1,
    })
    .eq('email', userEmail)

  if (updateError) {
    return { success: false, error: 'Erro ao atualizar créditos' }
  }

  // Definir prazos no chat thread
  const viewDeadline = new Date(now.getTime() + DEADLINES.CLIENT_VIEW_HOURS * 60 * 60 * 1000)

  await supabase
    .from('chat_threads')
    .update({
      client_response_deadline: viewDeadline.toISOString(),
    })
    .eq('need_id', needId)
    .eq('professional_email', userEmail)

  return { success: true }
}

export async function returnCredit(
  userEmail: string,
  chatThreadId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient()

  // Verificar se crédito já foi devolvido
  const { data: chat } = await supabase
    .from('chat_threads')
    .select('credit_returned')
    .eq('id', chatThreadId)
    .single()

  if (chat?.credit_returned) {
    return { success: false } // Já foi devolvido
  }

  // Devolver crédito
  const { data: user } = await supabase
    .from('users')
    .select('monthly_credits_used')
    .eq('email', userEmail)
    .single()

  if (user && user.monthly_credits_used > 0) {
    await supabase
      .from('users')
      .update({
        monthly_credits_used: user.monthly_credits_used - 1,
      })
      .eq('email', userEmail)

    // Marcar como devolvido
    await supabase
      .from('chat_threads')
      .update({ credit_returned: true })
      .eq('id', chatThreadId)
  }

  return { success: true }
}
