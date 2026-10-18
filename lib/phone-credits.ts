import { createServiceClient } from "@/lib/whatsapp-verification"

/**
 * Grants the 3 free proposals once per phone number, ever. The phone hash lives in
 * `free_credit_grants`, which survives account deletion, so re-registering with the
 * same number does not grant credits again.
 */
export async function grantFreeCreditsForPhone(
  userEmail: string,
  phone: string,
): Promise<{ creditsGranted: boolean; error?: string }> {
  const admin = createServiceClient()
  const { data, error } = await admin.rpc("grant_free_credits_by_phone", {
    p_email: userEmail.toLowerCase(),
    p_phone: phone,
  })

  if (error) {
    console.error("Erro ao conceder créditos gratuitos:", error.message)
    return { creditsGranted: false, error: error.message }
  }

  return { creditsGranted: data === true }
}
