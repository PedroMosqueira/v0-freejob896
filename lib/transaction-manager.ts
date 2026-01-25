import { createSupabaseServerClient } from "./supabase/server"

export interface TransactionFee {
  serviceAmount: number
  platformFeePercent: number
  platformFee: number
  totalAmount: number
  professionalCommissionPercent: number
  professionalCommission: number
  clientCashbackPercent: number
  clientCashback: number
}

export const TRANSACTION_CONFIG = {
  platformFeePercent: 0, // 0% de taxa - Gratuito no primeiro ano!
  professionalCommissionPercent: 0, // Sem comissoes no lancamento
  clientCashbackPercent: 0, // Sem cashback no lancamento
  maxPlanDiscount: 0, // Desabilitado desconto em plano (planos desativados)
}

// Calcular breakdown da transação (sem taxas no primeiro ano)
export function calculateTransactionFee(serviceAmount: number): TransactionFee {
  return {
    serviceAmount,
    platformFeePercent: 0,
    platformFee: 0,
    totalAmount: serviceAmount, // Sem taxa adicional
    professionalCommissionPercent: 0,
    professionalCommission: 0,
    clientCashbackPercent: 0,
    clientCashback: 0,
  }
}

// Criar transação
export async function createTransaction(
  needId: string,
  proposalId: string,
  professionalEmail: string,
  clientEmail: string,
  serviceAmount: number,
) {
  const supabase = createSupabaseServerClient()
  const fee = calculateTransactionFee(serviceAmount)

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      need_id: needId,
      proposal_id: proposalId,
      professional_email: professionalEmail,
      client_email: clientEmail,
      service_amount: fee.serviceAmount,
      platform_fee: fee.platformFee,
      total_amount: fee.totalAmount,
      professional_cashback: fee.professionalCommission,
      client_cashback: fee.clientCashback,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating transaction:", error)
    return null
  }

  return data
}

export async function completeTransaction(transactionId: string) {
  const supabase = createSupabaseServerClient()

  // Buscar transação
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single()

  if (txError || !transaction) {
    console.error("[v0] Transaction not found:", txError)
    return false
  }

  // Atualizar status da transação
  await supabase
    .from("transactions")
    .update({
      status: "completed",
      paid_at: new Date().toISOString(),
    })
    .eq("id", transactionId)

  await addProfessionalCommission(transaction.professional_email, transaction.professional_cashback, transactionId)

  // Adicionar cashback do cliente (crédito para usar)
  await addClientCashback(transaction.client_email, transaction.client_cashback, transactionId)

  return true
}

async function addProfessionalCommission(professionalEmail: string, amount: number, transactionId: string) {
  const supabase = createSupabaseServerClient()

  // Buscar usuário
  const { data: user } = await supabase
    .from("users")
    .select("cashback_balance, total_cashback_earned")
    .eq("email", professionalEmail)
    .single()

  if (!user) return

  const newBalance = (user.cashback_balance || 0) + amount
  const newTotal = (user.total_cashback_earned || 0) + amount

  // Atualizar saldo
  await supabase
    .from("users")
    .update({
      cashback_balance: newBalance,
      total_cashback_earned: newTotal,
    })
    .eq("email", professionalEmail)

  // Registrar histórico
  await supabase.from("cashback_history").insert({
    user_email: professionalEmail,
    transaction_id: transactionId,
    amount,
    type: "earned",
    description: "Comissão de transação na plataforma (30% da taxa)",
    balance_after: newBalance,
  })
}

// Adicionar cashback do cliente
async function addClientCashback(clientEmail: string, amount: number, transactionId: string) {
  const supabase = createSupabaseServerClient()

  // Buscar usuário
  const { data: user } = await supabase
    .from("users")
    .select("cashback_balance, total_cashback_earned")
    .eq("email", clientEmail)
    .single()

  if (!user) return

  const newBalance = (user.cashback_balance || 0) + amount
  const newTotal = (user.total_cashback_earned || 0) + amount

  // Atualizar saldo
  await supabase
    .from("users")
    .update({
      cashback_balance: newBalance,
      total_cashback_earned: newTotal,
    })
    .eq("email", clientEmail)

  // Registrar histórico
  await supabase.from("cashback_history").insert({
    user_email: clientEmail,
    transaction_id: transactionId,
    amount,
    type: "earned",
    description: "Cashback de transação na plataforma (crédito para próximas taxas)",
    balance_after: newBalance,
  })
}

// Buscar saldo de cashback/comissão
export async function getCashbackBalance(userEmail: string) {
  const supabase = createSupabaseServerClient()

  const { data: user } = await supabase
    .from("users")
    .select("cashback_balance, total_cashback_earned")
    .eq("email", userEmail)
    .single()

  return {
    balance: user?.cashback_balance || 0,
    totalEarned: user?.total_cashback_earned || 0,
  }
}

export async function getNextPlanPrice(professionalEmail: string): Promise<number> {
  // Função desabilitada durante lançamento gratuito
  // Retorna 0 pois não há cobrança de plano no momento
  return 0
}
