"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { auth } from "@/auth"

export interface UserProfile {
  id: string
  email: string
  fullName?: string
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
  servicesExecuted: number // Services completed as professional
  requestsCompleted: number // Requests completed as requester
  totalServices: number // Total for backward compatibility
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

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
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
    profiles[user.email] = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
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

  // Retornar apenas informações públicas
  return {
    ...profile,
    phone: undefined, // Não expor telefone publicamente
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

    const fullName = formData.get("fullName") as string
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

    const { error } = await supabase
      .from("users")
      .update({
        full_name: fullName || null,
        phone: phone || null,
        bio: bio || null,
        city: city || null,
        is_client: isClient,
        is_professional: isProfessional,
        skills: skills.length > 0 ? skills : null,
      })
      .eq("email", session.user.email)

    if (error) {
      console.error("Error updating profile:", error)
      return { success: false, message: "Erro ao atualizar perfil" }
    }

    return { success: true, message: "Perfil atualizado com sucesso!" }
  } catch (error) {
    console.error("Unexpected error updating profile:", error)
    return { success: false, message: "Erro inesperado ao atualizar perfil" }
  }
}

export async function sendPhoneVerificationCode(
  prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { success: false, message: "Você precisa estar autenticado" }
    }

    const phone = formData.get("phone") as string
    if (!phone) {
      return { success: false, message: "Telefone é obrigatório" }
    }

    // Validar formato do telefone (deve incluir código do país)
    if (!phone.startsWith("+")) {
      return {
        success: false,
        message: "Telefone deve incluir código do país (ex: +5511999999999)",
      }
    }

    const supabase = await createSupabaseServerClient()

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN

      if (!accountSid || !authToken) {
        console.log(`[v0] Twilio não configurado para ${phone}`)
        return {
          success: false,
          message: "Serviço de SMS não configurado",
        }
      }

      // Usar Twilio Verify API
      const verifyUrl = `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/Verifications`

      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          Channel: "sms",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Twilio Verify error:", errorData)
        return {
          success: false,
          message: "Erro ao enviar código de verificação",
        }
      }

      const result = await response.json()
      console.log("[v0] Twilio Verify initiated:", result.status)

      // Salvar telefone no banco
      const { error } = await supabase
        .from("users")
        .update({
          phone: phone,
        })
        .eq("email", session.user.email)

      if (error) {
        console.error("Error saving phone:", error)
        return { success: false, message: "Erro ao salvar telefone" }
      }

      return {
        success: true,
        message: "Código de verificação enviado por SMS!",
      }
    } catch (twilioError) {
      console.error("Error with Twilio Verify:", twilioError)
      return {
        success: false,
        message: "Erro ao enviar código de verificação",
      }
    }
  } catch (error) {
    console.error("Unexpected error sending verification code:", error)
    return { success: false, message: "Erro inesperado ao enviar código" }
  }
}

export async function verifyPhoneCode(
  prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { success: false, message: "Você precisa estar autenticado" }
    }

    const code = formData.get("code") as string
    if (!code) {
      return { success: false, message: "Código é obrigatório" }
    }

    const supabase = await createSupabaseServerClient()

    // Buscar telefone do usuário
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("phone")
      .eq("email", session.user.email)
      .single()

    if (fetchError || !user || !user.phone) {
      return { success: false, message: "Telefone não encontrado" }
    }

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN

      if (!accountSid || !authToken) {
        return {
          success: false,
          message: "Serviço de verificação não configurado",
        }
      }

      const verifyCheckUrl = `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`

      const response = await fetch(verifyCheckUrl, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: user.phone,
          Code: code,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Twilio Verify Check error:", errorData)
        return {
          success: false,
          message: "Código incorreto ou expirado",
        }
      }

      const result = await response.json()

      if (result.status !== "approved") {
        return {
          success: false,
          message: "Código incorreto ou expirado",
        }
      }

      console.log("[v0] Phone verified successfully:", result.status)

      // Marcar telefone como verificado
      const { error: updateError } = await supabase
        .from("users")
        .update({
          phone_verified: true,
        })
        .eq("email", session.user.email)

      if (updateError) {
        console.error("Error verifying phone:", updateError)
        return { success: false, message: "Erro ao verificar telefone" }
      }

      return { success: true, message: "Telefone verificado com sucesso!" }
    } catch (twilioError) {
      console.error("Error verifying code with Twilio:", twilioError)
      return {
        success: false,
        message: "Erro ao verificar código",
      }
    }
  } catch (error) {
    console.error("Unexpected error verifying phone:", error)
    return { success: false, message: "Erro inesperado ao verificar telefone" }
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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return { success: false, message: "O arquivo deve ser uma imagem" }
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, message: "A imagem deve ter no máximo 5MB" }
    }

    const supabase = await createSupabaseServerClient()

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop()
    const fileName = `${session.user.email}-${Date.now()}.${fileExt}`
    const filePath = `profile-images/${fileName}`

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      console.error("Error uploading image:", uploadError)
      return { success: false, message: "Erro ao fazer upload da imagem" }
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath)

    const imageUrl = urlData.publicUrl

    // Update user profile with image URL
    const { error: updateError } = await supabase
      .from("users")
      .update({ profile_image_url: imageUrl })
      .eq("email", session.user.email)

    if (updateError) {
      console.error("Error updating profile image URL:", updateError)
      return { success: false, message: "Erro ao atualizar foto de perfil" }
    }

    return {
      success: true,
      message: "Foto de perfil atualizada com sucesso!",
      imageUrl,
    }
  } catch (error) {
    console.error("Unexpected error uploading image:", error)
    return { success: false, message: "Erro inesperado ao fazer upload da imagem" }
  }
}
