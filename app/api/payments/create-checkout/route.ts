import { type NextRequest, NextResponse } from "next/server"
import { stripe, calculatePaymentAmounts, toCents } from "@/lib/stripe"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { proposalId, needId } = await request.json()

    if (!proposalId || !needId) {
      return NextResponse.json({ error: "proposalId e needId são obrigatórios" }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Buscar proposta
    const { data: proposal, error: proposalError } = await supabase
      .from("need_proposals")
      .select("*, needs(*)")
      .eq("id", proposalId)
      .single()

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 })
    }

    // Verificar se proposta foi aceita
    if (proposal.status !== "accepted_by_requester") {
      return NextResponse.json({ error: "Proposta precisa estar aceita para pagamento" }, { status: 400 })
    }

    // Calcular valores
    const amounts = calculatePaymentAmounts(Number(proposal.bid_amount))

    // Criar ou buscar cliente Stripe
    const { data: user } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("email", proposal.needs.requester_email)
      .single()

    let customerId: string | undefined

    // Buscar cliente existente
    const existingCustomers = await stripe.customers.list({
      email: proposal.needs.requester_email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id
    } else {
      // Criar novo cliente
      const customer = await stripe.customers.create({
        email: proposal.needs.requester_email,
        name: user?.full_name || undefined,
        metadata: {
          user_email: proposal.needs.requester_email,
        },
      })
      customerId = customer.id
    }

    // Criar Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toCents(amounts.totalAmount),
      currency: "brl",
      customer: customerId,
      metadata: {
        proposal_id: proposalId,
        need_id: needId,
        professional_email: proposal.professional_email,
        client_email: proposal.needs.requester_email,
        bid_amount: amounts.bidAmount.toString(),
        platform_fee: amounts.platformFee.toString(),
        professional_bonus: amounts.professionalBonus.toString(),
      },
      description: `Pagamento para: ${proposal.needs.title}`,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Registrar pagamento no banco
    const { error: paymentError } = await supabase.from("payments").insert({
      need_id: needId,
      proposal_id: proposalId,
      client_email: proposal.needs.requester_email,
      professional_email: proposal.professional_email,
      bid_amount: amounts.bidAmount,
      platform_fee: amounts.platformFee,
      professional_bonus: amounts.professionalBonus,
      total_amount: amounts.totalAmount,
      professional_receives: amounts.professionalReceives,
      platform_net: amounts.platformNet,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: customerId,
      status: "pending",
    })

    if (paymentError) {
      console.error("[v0] Erro ao registrar pagamento:", paymentError)
      // Cancelar payment intent se falhar
      await stripe.paymentIntents.cancel(paymentIntent.id)
      return NextResponse.json({ error: "Erro ao registrar pagamento" }, { status: 500 })
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amounts,
    })
  } catch (error) {
    console.error("[v0] Erro ao criar checkout:", error)
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 })
  }
}
