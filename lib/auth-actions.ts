"use server"

import { createClient } from "@/lib/supabase/client"

export async function checkUserStatus(prevState: any, formData: FormData) {
  const email = formData.get("email")

  if (!email) {
    return { error: "Email é obrigatório" }
  }

  const supabase = createClient()

  try {
    console.log("🔍 Checking user status for:", email.toString())

    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      return { error: "Erro ao verificar status do usuário" }
    }

    const authUser = users.users.find((user) => user.email === email.toString())

    const { data: customUser } = await supabase
      .from("users")
      .select("id, email, created_at")
      .eq("email", email.toString())
      .single()

    const status = {
      email: email.toString(),
      existsInAuth: !!authUser,
      emailVerified: authUser?.email_confirmed_at ? true : false,
      existsInCustomTable: !!customUser,
      authUserId: authUser?.id,
      customUserId: customUser?.id,
      verifiedAt: authUser?.email_confirmed_at,
      createdAt: authUser?.created_at || customUser?.created_at,
    }

    console.log("📊 User status:", status)

    return { success: true, status }
  } catch (error) {
    console.error("Error checking user status:", error)
    return { error: "Erro ao verificar status do usuário" }
  }
}

export async function signUpWithEmail(prevState: any, formData: FormData) {
  console.log("[v0] signUpWithEmail called")

  if (!formData) {
    console.log("[v0] Error: Form data is missing")
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const confirmPassword = formData.get("confirmPassword")

  console.log("[v0] Form data received:", { email: email?.toString(), hasPassword: !!password })

  if (!email || !password || !confirmPassword) {
    console.log("[v0] Error: Missing required fields")
    return { error: "Todos os campos são obrigatórios" }
  }

  if (password !== confirmPassword) {
    console.log("[v0] Error: Passwords don't match")
    return { error: "As senhas não conferem" }
  }

  const supabase = createClient()

  try {
    console.log("[v0] Starting registration for:", email.toString())

    const { data, error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
      },
    })

    console.log("[v0] SignUp response:", {
      success: !!data?.user,
      userId: data?.user?.id,
      error: error?.message,
    })

    if (error) {
      console.error("[v0] Registration error:", error)

      if (error.message.includes("already registered") || error.message.includes("User already registered")) {
        return {
          error: "Este email já possui uma conta. Use a opção 'Verificar Status' para mais detalhes.",
          showStatusCheck: true,
          email: email.toString(),
        }
      }

      if (error.message.includes("rate limit") || error.message.includes("too many")) {
        return {
          error: "Muitas tentativas de cadastro. Use a opção 'Verificar Status' para mais detalhes.",
          rateLimited: true,
          showStatusCheck: true,
          email: email.toString(),
        }
      }

      return { error: error.message }
    }

    console.log("✅ Registration successful, email sent to:", email.toString())

    return {
      success: "Verifique seu email! Enviamos um link de confirmação. O link expira em 1 hora.",
      email: email.toString(),
    }
  } catch (error) {
    console.error("Unexpected registration error:", error)
    return { error: "Ocorreu um erro inesperado. Tente novamente." }
  }
}

export async function clearUnverifiedUser(prevState: any, formData: FormData) {
  const email = formData.get("email")

  if (!email) {
    return { error: "Email é obrigatório" }
  }

  const supabase = createClient()

  try {
    console.log("🗑️ Attempting to clear unverified user:", email.toString())

    const { data: users, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error("Error listing users:", listError)
      return { error: "Erro ao buscar usuários. Tente novamente." }
    }

    const userToDelete = users.users.find((user) => user.email === email.toString() && !user.email_confirmed_at)

    if (!userToDelete) {
      console.log("No unverified user found for email:", email.toString())
      return {
        success: "Nenhum registro pendente encontrado. Você pode tentar se cadastrar normalmente.",
        cleared: true,
      }
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userToDelete.id)

    if (deleteError) {
      console.error("Error deleting user:", deleteError)
      return { error: "Não foi possível limpar o registro anterior. Tente com outro email." }
    }

    console.log("✅ Unverified user cleared:", email.toString())
    return {
      success: "Registro anterior removido com sucesso! Agora você pode se cadastrar novamente.",
      cleared: true,
    }
  } catch (error) {
    console.error("Unexpected error clearing user:", error)
    return { error: "Erro ao limpar registro. Tente com outro email." }
  }
}

export async function resendVerificationEmail(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")

  if (!email) {
    return { error: "Email é obrigatório" }
  }

  const supabase = createClient()

  try {
    console.log("🔄 Resending verification email to:", email.toString())

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.toString(),
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
      },
    })

    if (error) {
      console.error("Resend error:", error)

      if (error.message.includes("rate limit") || error.message.includes("too many")) {
        return {
          error: "Limite de reenvios atingido. Use a opção 'Verificar Status' para mais detalhes.",
          rateLimited: true,
          email: email.toString(),
        }
      }

      if (error.message.includes("already confirmed")) {
        return { success: "Email já confirmado. Você pode fazer login." }
      }

      return { error: error.message }
    }

    console.log("✅ Verification email resent to:", email.toString())

    return { success: "Email de verificação reenviado com sucesso!" }
  } catch (error) {
    console.error("Unexpected resend error:", error)
    return { error: "Erro inesperado ao reenviar email. Tente novamente." }
  }
}
