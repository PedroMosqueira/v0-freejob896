"use server"

import { stripe } from "@/lib/stripe"
import { activateSubscriptionFromCheckout, getCheckoutEmail } from "@/lib/stripe-subscription-sync"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { expressInterest } from "@/lib/interest-manager"
import { startChat } from "@/lib/needs-store"

export type ResumeCheckoutResult =
  | { status: "interest_done"; needId: string }
  | { status: "plan_active"; needId?: string; reason?: string }
  | { status: "error"; reason: string }

const NEED_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

/**
 * Runs when the user returns from Stripe Checkout. Confirms the payment
 * directly with Stripe (no waiting for the webhook), activates the plan and,
 * if the user came from a "Tenho interesse" attempt, completes that interest.
 */
export async function resumeAfterCheckout(
  sessionId: string,
  needId?: string | null,
): Promise<ResumeCheckoutResult> {
  try {
    if (!sessionId?.startsWith("cs_")) {
      return { status: "error", reason: "Sessão de pagamento inválida." }
    }

    const supabase = await createSupabaseServerClient()
    const { data: authData } = await supabase.auth.getUser()
    const sessionEmail = authData.user?.email?.trim().toLowerCase()

    if (!sessionEmail) {
      return { status: "error", reason: "Sua sessão expirou. Entre novamente para concluir." }
    }

    const checkout = await stripe.checkout.sessions.retrieve(sessionId)

    if (checkout.status !== "complete") {
      return { status: "error", reason: "O pagamento ainda não foi confirmado pelo Stripe." }
    }

    // Prevents someone from claiming another user's checkout by its id.
    if (getCheckoutEmail(checkout) !== sessionEmail) {
      return { status: "error", reason: "Este pagamento pertence a outra conta." }
    }

    await activateSubscriptionFromCheckout(checkout)

    const validNeedId = needId && NEED_ID_PATTERN.test(needId) ? needId : null
    if (!validNeedId) {
      return { status: "plan_active" }
    }

    const interest = await expressInterest(validNeedId)

    if (!interest.success) {
      if (interest.alreadyInterested) {
        return { status: "interest_done", needId: validNeedId }
      }
      return { status: "plan_active", needId: validNeedId, reason: interest.reason }
    }

    const { data: need } = await supabase
      .from("needs")
      .select("requester_email")
      .eq("id", validNeedId)
      .maybeSingle()

    if (need?.requester_email) {
      try {
        await startChat({
          needId: validNeedId,
          requesterEmail: need.requester_email,
          professionalEmail: authData.user!.email!,
          reason: "other",
          customText: "Profissional manifestou interesse em seu serviço.",
        })
      } catch (chatError) {
        console.error("[checkout-resume] Interest saved but chat failed to start:", chatError)
      }
    }

    return { status: "interest_done", needId: validNeedId }
  } catch (error) {
    console.error("[checkout-resume] Failed to resume after checkout:", error)
    return {
      status: "error",
      reason: "Não foi possível confirmar sua assinatura agora. Tente novamente em instantes.",
    }
  }
}
