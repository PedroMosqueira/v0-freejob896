"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

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
  const session = await auth()
  if (!session?.user?.email) {
    return { canRate: false, message: "Você precisa estar autenticado" }
  }

  if (session.user.email === ratedUserEmail) {
    return { canRate: false, message: "Você não pode avaliar a si mesmo" }
  }

  const supabase = await createSupabaseServerClient()

  if (needId) {
    const { data: proposal } = await supabase
      .from("need_proposals")
      .select("status")
      .eq("need_id", needId)
      .eq("professional_email", ratedUserEmail)
      .in("status", ["accepted_by_requester", "accepted_by_professional"])
      .single()

    if (!proposal) {
      return {
        canRate: false,
        message: "Você só pode avaliar profissionais cujas propostas foram aceitas",
      }
    }
  }

  // Verificar se já avaliou
  const { data: existingRating } = await supabase
    .from("ratings")
    .select("id")
    .eq("rated_user_email", ratedUserEmail)
    .eq("rater_user_email", session.user.email)
    .eq("need_id", needId || null)
    .single()

  if (existingRating) {
    return { canRate: false, message: "Você já avaliou este usuário" }
  }

  return { canRate: true }
}

export async function createRating(
  prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
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

    if (session.user.email === ratedUserEmail) {
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
      return { success: false, message: "Profissional não encontrado no sistema" }
    }

    if (needId) {
      const { data: proposal, error: proposalError } = await supabase
        .from("need_proposals")
        .select("status")
        .eq("need_id", needId)
        .eq("professional_email", ratedUserEmail)
        .in("status", ["accepted_by_requester", "accepted_by_professional"])
        .single()

      if (!proposal) {
        return {
          success: false,
          message: "Você só pode avaliar profissionais cujas propostas foram aceitas",
        }
      }
    }

    const { data: existingRating, error: existingError } = await supabase
      .from("ratings")
      .select("id")
      .eq("rated_user_email", ratedUserEmail)
      .eq("rater_user_email", session.user.email)
      .eq("need_id", needId || null)
      .maybeSingle()

    if (existingRating) {
      return { success: false, message: "Você já avaliou este usuário" }
    }

    const { error, data: insertedData } = await supabase
      .from("ratings")
      .insert({
        rated_user_email: ratedUserEmail,
        rater_user_email: session.user.email,
        need_id: needId || null,
        rating,
        comment: comment || null,
      })
      .select()

    if (error) {
      console.error("Error creating rating:", error)
      return { success: false, message: `Erro ao criar avaliação: ${error.message}` }
    }

    return { success: true, message: "Avaliação criada com sucesso!" }
  } catch (error) {
    console.error("Unexpected error creating rating:", error)
    return { success: false, message: "Erro inesperado ao criar avaliação" }
  }
}
