"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export interface UserProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  fullName?: string // Computed from firstName + lastName
  photoUrl?: string
  phone?: string
  phoneVerified: boolean
  bio?: string
  profileImageUrl?: string
  city?: string
  isClient: boolean
  isProfessional: boolean
  skills?: string[]
  rating: number
  servicesExecuted: number
  requestsCompleted: number
  totalServices: number
  verifiedAt?: string
  createdAt: string
  updatedAt?: string
}

export async function getUserProfile(email: string): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.from("users").select("*").eq("email", email).single()

  if (error || !data) {
    console.error("Error fetching user profile:", error)
    return null
  }

  let servicesExecuted = 0

  const { data: professionalServices } = await supabase
    .from("need_proposals")
    .select("need_id")
    .eq("professional_email", email)
    .eq("status", "accepted_by_requester")

  if (professionalServices && professionalServices.length > 0) {
    const needIds = professionalServices.map((p) => p.need_id)

    const { data: completedNeeds } = await supabase
      .from("needs")
      .select("id", { count: "exact" })
      .in("id", needIds)
      .eq("status", "concluido")

    servicesExecuted = completedNeeds?.length || 0
  }

  const { data: requesterServices } = await supabase
    .from("needs")
    .select("id", { count: "exact" })
    .eq("requester_email", email)
    .eq("status", "concluido")

  const requestsCompleted = requesterServices?.length || 0

  const firstName = data.first_name || ""
  const lastName = data.last_name || ""
  const fullName = `${firstName} ${lastName}`.trim() || data.full_name || ""

  return {
    id: data.id,
    email: data.email,
    firstName,
    lastName,
    fullName,
    photoUrl: data.profile_image_url,
    phone: data.phone,
    phoneVerified: data.phone_verified || false,
    bio: data.bio,
    profileImageUrl: data.profile_image_url,
    city: data.city,
    isClient: data.is_client ?? true,
    isProfessional: data.is_professional ?? false,
    skills: data.skills || [],
    rating: data.rating || 0,
    servicesExecuted,
    requestsCompleted,
    totalServices: servicesExecuted + requestsCompleted,
    verifiedAt: data.verified_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function getUserProfiles(emails: string[]): Promise<Record<string, UserProfile>> {
  if (emails.length === 0) return {}

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.from("users").select("*").in("email", emails)

  if (error || !data) {
    console.error("Error fetching user profiles:", error)
    return {}
  }

  const profiles: Record<string, UserProfile> = {}

  for (const user of data) {
    const firstName = user.first_name || ""
    const lastName = user.last_name || ""
    const fullName = `${firstName} ${lastName}`.trim() || user.full_name || ""

    profiles[user.email] = {
      id: user.id,
      email: user.email,
      firstName,
      lastName,
      fullName,
      photoUrl: user.profile_image_url,
      phone: user.phone,
      phoneVerified: user.phone_verified || false,
      bio: user.bio,
      profileImageUrl: user.profile_image_url,
      city: user.city,
      isClient: user.is_client ?? true,
      isProfessional: user.is_professional ?? false,
      skills: user.skills || [],
      rating: user.rating || 0,
      servicesExecuted: 0,
      requestsCompleted: 0,
      totalServices: 0,
      verifiedAt: user.verified_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }
  }

  return profiles
}

export async function getPublicProfile(email: string): Promise<UserProfile | null> {
  const profile = await getUserProfile(email)
  if (!profile) return null

  return {
    ...profile,
    phone: undefined,
  }
}

export async function updateUserProfile(
  prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { success: false, message: "Você precisa estar autenticado" }
    }

    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const phone = formData.get("phone") as string
    const bio = formData.get("bio") as string
    const city = formData.get("city") as string
    const isClient = formData.get("isClient") === "true"
    const isProfessional = formData.get("isProfessional") === "true"
    const skillsString = formData.get("skills") as string
    const skills = skillsString
      ? skillsString
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    const supabase = await createSupabaseServerClient()

    const fullName = `${firstName || ""} ${lastName || ""}`.trim()

    const updateData = {
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: fullName || null,
      phone: phone || null,
      bio: bio || null,
      city: city || null,
      is_client: isClient,
      is_professional: isProfessional,
      skills: skills.length > 0 ? skills : null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("users").update(updateData).eq("email", session.user.email).select()

    if (error) {
      console.error("Erro ao atualizar perfil:", error)
      return { success: false, message: "Erro ao atualizar perfil" }
    }

    revalidatePath("/profile")
    revalidatePath("/profile/[email]", "page")

    return { success: true, message: "Perfil atualizado com sucesso!" }
  } catch (error) {
    console.error("Erro inesperado ao atualizar perfil:", error)
    return { success: false, message: "Erro inesperado ao atualizar perfil" }
  }
}

export async function uploadProfileImage(
  prevState: { success: boolean; message: string; imageUrl?: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string; imageUrl?: string }> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { success: false, message: "Você precisa estar autenticado" }
    }

    const file = formData.get("file") as File
    if (!file) {
      return { success: false, message: "Nenhum arquivo selecionado" }
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, message: "O arquivo deve ser uma imagem" }
    }

    if (file.size > 10 * 1024 * 1024) {
      return { success: false, message: "A imagem deve ter no máximo 10MB" }
    }

    console.log("[v0] Uploading image:", { size: `${(file.size / 1024 / 1024).toFixed(2)}MB`, type: file.type })

    const supabase = await createSupabaseServerClient()

    const fileExt = file.name.split(".").pop()
    const fileName = `${session.user.email}-${Date.now()}.${fileExt}`
    const filePath = `profile-images/${fileName}`

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      console.error("[v0] Error uploading image:", uploadError)
      return { success: false, message: "Erro ao fazer upload da imagem" }
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath)

    const imageUrl = urlData.publicUrl

    const { error: updateError } = await supabase
      .from("users")
      .update({ profile_image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq("email", session.user.email)

    if (updateError) {
      console.error("[v0] Error updating profile image URL:", updateError)
      return { success: false, message: "Erro ao atualizar foto de perfil" }
    }

    console.log("[v0] Profile image uploaded successfully:", imageUrl)

    revalidatePath("/profile")
    revalidatePath("/profile/[email]", "page")

    return {
      success: true,
      message: "Foto de perfil atualizada com sucesso!",
      imageUrl,
    }
  } catch (error) {
    console.error("[v0] Unexpected error uploading image:", error)
    return { success: false, message: "Erro inesperado ao fazer upload da imagem" }
  }
}
