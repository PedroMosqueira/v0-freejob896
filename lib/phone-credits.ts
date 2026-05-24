import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Grant 3 free credits to a professional user if they haven't received them yet.
 * This can only be called once per user, regardless of phone validation method.
 */
export async function grantFreeCreditsIfFirstTime(userEmail: string): Promise<{
  success: boolean
  creditsGranted: boolean
  message: string
}> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Check if user has already received free credits
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("has_received_free_credits, is_professional")
      .eq("email", userEmail)
      .single()

    if (userError || !user) {
      return {
        success: false,
        creditsGranted: false,
        message: "Usuário não encontrado",
      }
    }

    // If user is not professional, don't grant credits
    if (!user.is_professional) {
      return {
        success: true,
        creditsGranted: false,
        message: "Usuário não é profissional",
      }
    }

    // If user has already received free credits, don't grant again
    if (user.has_received_free_credits) {
      return {
        success: true,
        creditsGranted: false,
        message: "Usuário já recebeu seus créditos gratuitos",
      }
    }

    // Grant 3 free credits and mark as received
    const { error: updateError } = await supabase
      .from("users")
      .update({
        free_interests_remaining: 3,
        has_received_free_credits: true,
      })
      .eq("email", userEmail)

    if (updateError) {
      console.error("Erro ao conceder créditos gratuitos:", updateError)
      return {
        success: false,
        creditsGranted: false,
        message: "Erro ao conceder créditos gratuitos",
      }
    }

    return {
      success: true,
      creditsGranted: true,
      message: "3 propostas gratuitas concedidas com sucesso",
    }
  } catch (error) {
    console.error("Erro ao processar créditos gratuitos:", error)
    return {
      success: false,
      creditsGranted: false,
      message: "Erro ao processar créditos gratuitos",
    }
  }
}
