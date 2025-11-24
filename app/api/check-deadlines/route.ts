import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DEADLINES } from '@/lib/plan-limits'

// Esta rota deve ser chamada por um cron job (ex: Vercel Cron)
export async function GET() {
  const supabase = await createClient()
  const now = new Date()

  console.log('[v0] Checking deadlines at', now.toISOString())

  // 1. Verificar chats onde cliente não visualizou no prazo
  const { data: unviewedChats } = await supabase
    .from('chat_threads')
    .select('id, need_id, client_response_deadline')
    .is('client_viewed_at', null)
    .not('client_response_deadline', 'is', null)
    .lte('client_response_deadline', now.toISOString())

  if (unviewedChats && unviewedChats.length > 0) {
    console.log(`[v0] Suspending ${unviewedChats.length} needs due to client not viewing`)

    for (const chat of unviewedChats) {
      // Suspender pedido
      await supabase
        .from('needs')
        .update({
          suspended: true,
          suspended_reason: 'Cliente não visualizou interesse no prazo de 24h',
          suspended_at: now.toISOString(),
          status: 'suspenso',
        })
        .eq('id', chat.need_id)
    }
  }

  // 2. Verificar chats onde profissional não enviou lance no prazo
  const { data: noBidChats } = await supabase
    .from('chat_threads')
    .select('id, need_id, professional_email, bid_deadline, client_viewed_at')
    .is('bid_sent_at', null)
    .not('client_viewed_at', null)
    .not('bid_deadline', 'is', null)
    .lte('bid_deadline', now.toISOString())

  if (noBidChats && noBidChats.length > 0) {
    console.log(`[v0] ${noBidChats.length} professionals missed bid deadline - credits NOT returned`)
    // Crédito não é devolvido (penalidade)
  }

  // 3. Verificar propostas onde cliente não respondeu no prazo
  const { data: unrespondedProposals } = await supabase
    .from('need_proposals')
    .select('id, need_id, professional_email')
    .eq('status', 'pending')
    .lt('created_at', new Date(now.getTime() - DEADLINES.CLIENT_RESPONSE_HOURS * 60 * 60 * 1000).toISOString())

  if (unrespondedProposals && unrespondedProposals.length > 0) {
    console.log(`[v0] Suspending ${unrespondedProposals.length} needs due to no response to proposals`)

    for (const proposal of unrespondedProposals) {
      // Suspender pedido
      await supabase
        .from('needs')
        .update({
          suspended: true,
          suspended_reason: 'Cliente não respondeu proposta no prazo de 48h',
          suspended_at: now.toISOString(),
          status: 'suspenso',
        })
        .eq('id', proposal.need_id)
    }
  }

  // 4. Auto-confirmar serviços concluídos há mais de 24h
  const { data: completedServices } = await supabase
    .from('need_proposals')
    .select('id, need_id')
    .eq('completion_status', 'completed')
    .is('confirmed_by_client_at', null)
    .lt('completed_by_professional_at', new Date(now.getTime() - DEADLINES.AUTO_CONFIRM_HOURS * 60 * 60 * 1000).toISOString())

  if (completedServices && completedServices.length > 0) {
    console.log(`[v0] Auto-confirming ${completedServices.length} completed services`)

    for (const service of completedServices) {
      await supabase
        .from('need_proposals')
        .update({
          completion_status: 'confirmed',
          confirmed_by_client_at: now.toISOString(),
        })
        .eq('id', service.id)

      // Atualizar status do need
      await supabase
        .from('needs')
        .update({ status: 'concluido' })
        .eq('id', service.need_id)
    }
  }

  return NextResponse.json({
    success: true,
    processed: {
      unviewedChats: unviewedChats?.length || 0,
      noBidChats: noBidChats?.length || 0,
      unrespondedProposals: unrespondedProposals?.length || 0,
      autoConfirmed: completedServices?.length || 0,
    },
  })
}
