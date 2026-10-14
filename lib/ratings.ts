"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

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

    return { success: true, message: "Avaliação criada com sucesso!" }
  } catch (error) {
    console.error("Unexpected error creating rating:", error)
    return { success: false, message: "Erro inesperado ao criar avaliação" }
  }
}
