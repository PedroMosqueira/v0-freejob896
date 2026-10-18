"use server"

import { createClient } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { buildNotificationUrl, safeSendPush } from "@/lib/push-notifications-server"
import { sendNotificationEmail } from "@/lib/email-notifications"

/**
 * Tells the rated user they received a review: a bell entry plus its own push.
 * Uses the service role because the rater can't insert notifications for someone else.
 * Failures are logged and never block the rating itself.
 */
async function notifyRatingReceived(
  ratedEmail: string,
  stars: number,
  comment: string | null,
  needId: string | null,
): Promise<void> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: need } = needId
      ? await admin.from("needs").select("title").eq("id", needId).maybeSingle()
      : { data: null }

    const title = `Você recebeu uma avaliação de ${stars} ${stars === 1 ? "estrela" : "estrelas"}`
    const trimmedComment = comment?.trim()
    const context = need?.title ? `em "${need.title}"` : ""
    const message = trimmedComment
      ? `${context ? `${context}: ` : ""}"${trimmedComment.length > 100 ? `${trimmedComment.slice(0, 100)}...` : trimmedComment}"`
      : context
        ? `Seu trabalho ${context} foi avaliado.`
        : "Confira sua nova avaliação no seu perfil."

    const { error } = await admin.from("notifications").insert({
      user_id: ratedEmail,
      title,
      message,
      type: "rating",
      related_need_id: needId || null,
      is_read: false,
    })
    if (error) console.error("[ratings] Failed to create rating notification:", error.message)

    await Promise.all([
      safeSendPush(ratedEmail, { title, body: message, data: { url: buildNotificationUrl(needId) } }),
      sendNotificationEmail(ratedEmail, { title, message, url: "/profile", ctaLabel: "Ver minhas avaliações" }),
    ])
  } catch (error) {
    console.error("[ratings] Failed to notify rating:", error)
  }
}

async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export interface Rating {
  id: string
  ratedUserEmail: string
  raterUserEmail: string
  raterName?: string
  raterImageUrl?: string
  needId?: string
  rating: number
  comment?: string
  createdAt: string
  updatedAt?: string
}

export async function getUserRatings(userEmail: string): Promise<Rating[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from("ratings")
    .select(
      `
      *,
      rater:users!ratings_rater_user_email_fkey(full_name, profile_image_url)
    `,
    )
    .eq("rated_user_email", userEmail)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching ratings:", error)
    return []
  }

  return (
    data?.map((r: any) => ({
      id: r.id,
      ratedUserEmail: r.rated_user_email,
      raterUserEmail: r.rater_user_email,
      raterName: r.rater?.full_name,
      raterImageUrl: r.rater?.profile_image_url,
      needId: r.need_id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })) || []
  )
}

export async function canUserRate(
  ratedUserEmail: string,
  needId?: string,
): Promise<{ canRate: boolean; message?: string }> {
  const user = await getCurrentUser()
  if (!user?.email) {
    return { canRate: false, message: "Você precisa estar autenticado" }
  }

  if (user.email === ratedUserEmail) {
    return { canRate: false, message: "Você não pode avaliar a si mesmo" }
  }

  const supabase = await createSupabaseServerClient()

  if (needId) {
    const relationshipError = await validateRatingRelationship(supabase, needId, user.email, ratedUserEmail)
    if (relationshipError) {
      return { canRate: false, message: relationshipError }
    }
  }

  if (await hasAlreadyRated(supabase, user.email, ratedUserEmail, needId)) {
    return { canRate: false, message: "Você já avaliou este usuário" }
  }

  return { canRate: true }
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

const ACCEPTED_PROPOSAL_STATUSES = ["accepted_by_requester", "accepted_by_professional"]

// Ratings go both ways on a job: the requester rates the accepted professional,
// and the accepted professional rates the requester.
async function validateRatingRelationship(
  supabase: SupabaseServerClient,
  needId: string,
  raterEmail: string,
  ratedEmail: string,
): Promise<string | null> {
  const { data: need } = await supabase.from("needs").select("requester_email").eq("id", needId).maybeSingle()

  if (!need?.requester_email) {
    return "Pedido não encontrado"
  }

  const requesterEmail = need.requester_email.toLowerCase()
  const raterIsRequester = raterEmail.toLowerCase() === requesterEmail
  const professionalEmail = raterIsRequester ? ratedEmail : raterEmail

  if (!raterIsRequester && ratedEmail.toLowerCase() !== requesterEmail) {
    return "Você só pode avaliar o solicitante de um serviço que você realizou"
  }

  const { data: proposal } = await supabase
    .from("need_proposals")
    .select("id")
    .eq("need_id", needId)
    .ilike("professional_email", professionalEmail)
    .in("status", ACCEPTED_PROPOSAL_STATUSES)
    .limit(1)
    .maybeSingle()

  if (!proposal) {
    return raterIsRequester
      ? "Você só pode avaliar profissionais cujas propostas foram aceitas"
      : "Você só pode avaliar o solicitante de um serviço que você realizou"
  }

  return null
}

async function hasAlreadyRated(
  supabase: SupabaseServerClient,
  raterEmail: string,
  ratedEmail: string,
  needId?: string | null,
): Promise<boolean> {
  let query = supabase
    .from("ratings")
    .select("id")
    .ilike("rated_user_email", ratedEmail)
    .ilike("rater_user_email", raterEmail)

  query = needId ? query.eq("need_id", needId) : query.is("need_id", null)

  const { data } = await query.limit(1).maybeSingle()
  return !!data
}

export async function createRating(
  prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser()

    if (!user?.email) {
      return { success: false, message: "Você precisa estar autenticado" }
    }

    const ratedUserEmail = formData.get("ratedUserEmail") as string
    const needId = formData.get("needId") as string | null
    const rating = Number.parseInt(formData.get("rating") as string)
    const comment = formData.get("comment") as string

    if (!ratedUserEmail || !rating) {
      return { success: false, message: "Dados inválidos" }
    }

    if (rating < 1 || rating > 5) {
      return { success: false, message: "Avaliação deve ser entre 1 e 5 estrelas" }
    }

    if (user.email === ratedUserEmail) {
      return { success: false, message: "Você não pode avaliar a si mesmo" }
    }

    const supabase = await createSupabaseServerClient()

    const { data: ratedUser, error: userCheckError } = await supabase
      .from("users")
      .select("email")
      .eq("email", ratedUserEmail)
      .single()

    if (userCheckError || !ratedUser) {
      console.error("Rated user not found:", ratedUserEmail, userCheckError)
      return { success: false, message: "Usuário não encontrado no sistema" }
    }

    if (needId) {
      const relationshipError = await validateRatingRelationship(supabase, needId, user.email, ratedUserEmail)
      if (relationshipError) {
        return { success: false, message: relationshipError }
      }
    }

    if (await hasAlreadyRated(supabase, user.email, ratedUserEmail, needId)) {
      return { success: false, message: "Você já avaliou este usuário" }
    }

    const { error, data: insertedData } = await supabase
      .from("ratings")
      .insert({
        rated_user_email: ratedUserEmail,
        rater_user_email: user.email,
        need_id: needId || null,
        rating,
        comment: comment || null,
      })
      .select()

    if (error) {
      console.error("Error creating rating:", error)
      return { success: false, message: `Erro ao criar avaliação: ${error.message}` }
    }

    // Rating a job the professional marked as done closes the request.
    if (needId) {
      await supabase
        .from("needs")
        .update({ status: "concluido" })
        .eq("id", needId)
        .eq("status", "aguardando_avaliacao")
        .ilike("requester_email", user.email)
    }

    await notifyRatingReceived(ratedUserEmail, rating, comment, needId)

    return { success: true, message: "Avaliação criada com sucesso!" }
  } catch (error) {
    console.error("Unexpected error creating rating:", error)
    return { success: false, message: "Erro inesperado ao criar avaliação" }
  }
}
