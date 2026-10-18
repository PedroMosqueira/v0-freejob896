// Plain server module (not "use server"): these helpers write with the service role,
// so they must never be exposed as Server Actions callable from the browser.
import { createServiceClient } from "@/lib/whatsapp-verification"
import { buildNotificationUrl, safeSendPush } from "@/lib/push-notifications-server"
import { sendNotificationEmail } from "@/lib/email-notifications"

export async function insertInterestProposal(needId: string, professionalEmail: string): Promise<{ id: string }> {
  const admin = createServiceClient()

  const { data, error } = await admin
    .from("need_proposals")
    .insert({
      need_id: needId,
      professional_email: professionalEmail,
      type: "interest_only",
      status: "interested",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new Error(`Falha ao registrar interesse: ${error?.message || "Erro desconhecido"}`)
  }

  const { data: need } = await admin.from("needs").select("requester_email, title").eq("id", needId).single()

  if (need?.requester_email) {
    const title = "Novo interesse em seu serviço"
    const message = `Um profissional demonstrou interesse em "${need.title}"`
    const now = new Date().toISOString()

    const { error: notificationError } = await admin.from("notifications").insert({
      user_id: need.requester_email,
      title,
      message,
      type: "interest",
      is_read: false,
      related_need_id: needId,
      related_proposal_id: data.id,
      created_at: now,
      updated_at: now,
    })

    if (notificationError) {
      console.error("[interest-proposal] Failed to create notification:", notificationError)
    } else {
      const url = buildNotificationUrl(needId)
      await Promise.all([
        safeSendPush(need.requester_email, { title, body: message, data: { url } }),
        sendNotificationEmail(need.requester_email, { title, message, url }),
      ])
    }
  }

  return { id: data.id }
}

export async function consumeInterestCredit(
  userEmail: string,
  consumeFreeCredit: boolean,
): Promise<{ success: boolean; error?: string }> {
  const admin = createServiceClient()

  const { data: user, error: userError } = await admin
    .from("users")
    .select("free_interests_remaining, total_interests_sent")
    .eq("email", userEmail)
    .maybeSingle()

  if (userError || !user) {
    return { success: false, error: "Usuário não encontrado" }
  }

  const currentFreeRemaining = Math.max(0, user.free_interests_remaining ?? 0)
  const newFreeRemaining =
    consumeFreeCredit && currentFreeRemaining > 0 ? currentFreeRemaining - 1 : currentFreeRemaining

  const { error: updateError } = await admin
    .from("users")
    .update({
      free_interests_remaining: newFreeRemaining,
      total_interests_sent: (user.total_interests_sent ?? 0) + 1,
    })
    .eq("email", userEmail)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true }
}
