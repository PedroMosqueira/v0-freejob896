import { createSupabaseServerClient } from "@/lib/supabase/server"
import bcrypt from "bcryptjs"

interface User {
  id: string
  email: string
  passwordHash: string
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.from("users").select("id, email, password_hash").eq("email", email).single()
    if (error && error.code !== "PGRST116") return undefined
    if (!data) return undefined
    return { id: data.id, email: data.email, passwordHash: data.password_hash }
  } catch (error) {
    console.warn("[v0] getUserByEmail: Supabase not available during build", error instanceof Error ? error.message : error)
    return undefined
  }
}

export async function verifyPassword(user: User, passwordAttempt: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwordAttempt,
    })
    return !error
  } catch (error) {
    console.warn("[v0] verifyPassword: Supabase not available", error instanceof Error ? error.message : error)
    return false
  }
}

export async function addUser(email: string, passwordPlain: string): Promise<User> {
  try {
    const supabase = await createSupabaseServerClient()
    const passwordHash = await bcrypt.hash(passwordPlain, 10)
    const { data, error } = await supabase
      .from("users")
      .insert([{ email, password_hash: passwordHash }])
      .select("id, email, password_hash")
      .single()
    if (error) throw new Error(`Falha ao criar usuário: ${error.message}`)
    return { id: data.id, email: data.email, passwordHash: data.password_hash }
  } catch (error) {
    console.warn("[v0] addUser: Supabase error", error instanceof Error ? error.message : error)
    throw error
  }
}

export async function updateUserPassword(
  previousState: { success: boolean; message: string },
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const email = formData.get("email") as string
    const currentPasswordPlain = formData.get("currentPassword") as string
    const newPasswordPlain = formData.get("newPassword") as string
    const confirmNewPassword = formData.get("confirmNewPassword") as string

    if (!email) {
      return { success: false, message: "Erro: Email do usuário não foi encontrado." }
    }
    if (newPasswordPlain !== confirmNewPassword) {
      return { success: false, message: "A nova senha e a confirmação não conferem." }
    }
    if (newPasswordPlain.length < 8) {
      return { success: false, message: "A nova senha deve ter pelo menos 8 caracteres." }
    }

    const supabase = await createSupabaseServerClient()
    const user = await getUserByEmail(email)
    if (!user) {
      return { success: false, message: "Usuário não encontrado." }
    }

    const isCurrentPasswordCorrect = await verifyPassword(user, currentPasswordPlain)
    if (!isCurrentPasswordCorrect) {
      return { success: false, message: "Senha atual incorreta." }
    }

    const newPasswordHash = await bcrypt.hash(newPasswordPlain, 10)
    const { error } = await supabase.from("users").update({ password_hash: newPasswordHash }).eq("email", email)

    if (error) {
      const errorMessage = typeof error.message === "string" ? error.message : "Erro desconhecido"
      return { success: false, message: `Falha ao atualizar senha: ${errorMessage}` }
    }

    return {
      success: true,
      message: "Senha atualizada com sucesso.",
    }
  } catch (e) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado no servidor. Tente novamente.",
    }
  }
}
