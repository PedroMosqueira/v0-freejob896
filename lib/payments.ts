"use server"

import { createSupabaseServerClient } from "./supabase/server"

export async function getPaymentByProposal(proposalId: string) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error("[v0] Erro ao buscar pagamento:", error)
    return null
  }

  return data
}

export async function releasePayment(paymentId: string) {
  const supabase = await createSupabaseServerClient()

  // Atualizar status para "released"
  const { error } = await supabase
    .from("payments")
    .update({
      status: "released",
      released_at: new Date().toISOString(),
    })
    .eq("id", paymentId)

  if (error) {
    throw new Error(`Erro ao liberar pagamento: ${error.message}`)
  }

  // TODO: Implementar transferência via Stripe Connect para o profissional
  // Isso requer configurar Stripe Connect e fazer onboarding dos profissionais

  return true
}
