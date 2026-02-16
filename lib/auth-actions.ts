"use server"

console.log("[v0] ✅ Alterações de verificação de email DUPLICADO estão em vigor - lib/auth-actions.ts carregado!")
console.log("[v0] ✅ Sistema de EMAIL PENDENTE implementado!")
console.log("[v0] ✅ Reenvio de email de confirmação melhorado!")

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function checkUserStatus(prevState: any, formData: FormData) {
  const email = formData.get("email")

  if (!email) {
    return { error: "Email é obrigatório" }
  }

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("[v0] Error: NEXT_PUBLIC_SUPABASE_URL is not set")
    return { error: "Configuração de servidor incompleta. Tente novamente." }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[v0] Error: SUPABASE_SERVICE_ROLE_KEY is not set")
    return { error: "Configuração de servidor incompleta. Tente novamente." }
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    },
  )

  try {
    console.log("[v0] 🔍 Checking user status for:", email.toString())

    // Check Supabase Auth
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.error("[v0] Error listing users:", listError)
      return { error: "Erro ao verificar status do usuário" }
    }

    console.log("[v0] Found users in auth:", users.users.length)
    const authUser = users.users.find((user) => user.email === email.toString())
    console.log("[v0] Auth user found:", !!authUser)

    // Check custom users table
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
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const confirmPassword = formData.get("confirmPassword")

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("[v0] Error: NEXT_PUBLIC_SUPABASE_URL is not set")
    return { error: "Configuração de servidor incompleta. Tente novamente." }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("[v0] Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set")
    return { error: "Configuração de servidor incompleta. Tente novamente." }
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    },
  )

  try {
    console.log("[v0] 📝 Starting signup for email:", email.toString())
    
    // First, check if there's already a pending/unconfirmed user with this email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    if (!listError && users.users) {
      const existingUser = users.users.find((user) => user.email === email.toString())
      if (existingUser) {
        console.log("[v0] 🔍 Found existing user:", {
          email: existingUser.email,
          confirmed: existingUser.email_confirmed_at ? true : false,
          lastSignInAt: existingUser.last_sign_in_at,
        })

        // Se o usuário existe mas não confirmou o email
        if (!existingUser.email_confirmed_at) {
          console.log("[v0] ⚠️ Email pending confirmation, suggesting resend")
          return {
            error: "Este email ainda está aguardando confirmação. O link de confirmação foi enviado. Se não recebeu o email, clique em 'Reenviar Email de Confirmação'.",
            showResendOption: true,
            email: email.toString(),
            isPendingConfirmation: true,
          }
        }

        // Se o usuário existe e confirmou
        if (existingUser.email_confirmed_at) {
          console.log("[v0] 🔴 Email already confirmed")
          return {
            error: "Este email já possui uma conta confirmada. Use 'Fazer Login' ou 'Recuperar Senha' se esqueceu a senha.",
            showStatusCheck: true,
            email: email.toString(),
            isDuplicateEmail: true,
          }
        }
      }
    }
    
    const { data, error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
      },
    })

    if (error) {
      console.error("[v0] ❌ SignUp error details:", {
        message: error.message,
        code: error.code,
        status: error.status,
        fullError: JSON.stringify(error),
      })

      // Check for duplicate email - more comprehensive
      if (
        error.message.includes("already registered") ||
        error.message.includes("User already registered") ||
        error.message.toLowerCase().includes("unique") ||
        error.message.toLowerCase().includes("duplicate") ||
        error.status === 422
      ) {
        console.log("[v0] 🔴 Email duplicado detectado:", email.toString())
        return {
          error: "Este email já possui uma conta cadastrada. Escolha outro email ou use 'Verificar Status' para recuperar sua conta.",
          showStatusCheck: true,
          email: email.toString(),
          isDuplicateEmail: true,
        }
      }

      if (error.message.includes("rate limit") || error.message.includes("too many")) {
        console.log("[v0] ⏱️ Rate limit atingido para:", email.toString())
        return {
          error: "Muitas tentativas de cadastro. Aguarde alguns minutos antes de tentar novamente. Use 'Verificar Status' para mais detalhes.",
          rateLimited: true,
          showStatusCheck: true,
          email: email.toString(),
        }
      }

      console.log("[v0] ⚠️ Outro erro durante signup:", error.message)
      return { error: error.message }
    }
    
    console.log("[v0] ✅ Signup successful for:", email.toString())

    // Verificação adicional: se o usuário foi criado mas o email pode não ter sido enviado
    if (data?.user && data?.user?.email_confirmed_at === null) {
      console.log("[v0] User created, awaiting email verification")
    }

    return {
      success: "Verifique seu email! Enviamos um link de confirmação. O link expira em 1 hora.",
      email: email.toString(),
    }
  } catch (error) {
    console.error("[v0] Unexpected signup error:", error)
    return { error: "Ocorreu um erro inesperado. Tente novamente." }
  }
}

export async function clearUnverifiedUser(prevState: any, formData: FormData) {
  const email = formData.get("email")

  if (!email) {
    return { error: "Email é obrigatório" }
  }

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("[v0] Error: NEXT_PUBLIC_SUPABASE_URL is not set")
    return { error: "Configuração de servidor incompleta. Tente novamente." }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[v0] Error: SUPABASE_SERVICE_ROLE_KEY is not set")
    return { error: "Configuração de servidor incompleta. Tente novamente." }
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, // Use service role to delete users
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    },
  )

  try {
    console.log("🗑️ Attempting to clear unverified user:", email.toString())

    // First, find the user by email
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

    // Delete the unverified user
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

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("[v0] Error: NEXT_PUBLIC_SUPABASE_URL is not set")
    return { error: "Configuração de servidor incompleta. Tente novamente." }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("[v0] Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set")
    return { error: "Configuração de servidor incompleta. Tente novamente." }
  }

  try {
    console.log("[v0] 🔄 Resending verification email to:", email.toString())

    // Use REST API diretamente para reenviar email sem necessidade de sessão
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/resend`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: "signup",
          email: email.toString(),
          redirect_to:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
        }),
      },
    )

    const data = await response.json()

    if (!response.ok) {
      console.error("[v0] ❌ Resend error:", {
        status: response.status,
        message: data.message || data.error,
        fullResponse: JSON.stringify(data),
      })

      if (data.error_code === "rate_limit_exceeded" || data.message?.includes("rate limit") || data.message?.includes("too many")) {
        console.log("[v0] ⏱️ Rate limit reached for resend")
        return {
          error: "Limite de reenvios atingido. Aguarde alguns minutos antes de tentar novamente.",
          rateLimited: true,
          email: email.toString(),
        }
      }

      if (data.message?.includes("already confirmed")) {
        console.log("[v0] ✅ Email already confirmed")
        return { success: "Email já confirmado. Você pode fazer login agora." }
      }

      if (data.message?.includes("not found") || data.message?.includes("User not found")) {
        console.log("[v0] ⚠️ User not found for resend:", email.toString())
        return { 
          error: "Usuário não encontrado. Verifique o email ou registre-se novamente.",
          email: email.toString()
        }
      }

      return { error: data.message || "Erro ao reenviar email" }
    }

    console.log("[v0] ✅ Verification email resent to:", email.toString())

    return { 
      success: "Email de verificação reenviado com sucesso! Verifique sua caixa de entrada e pasta de spam." 
    }
  } catch (error) {
    console.error("[v0] ❌ Unexpected resend error:", error)
    return { error: "Erro inesperado ao reenviar email. Tente novamente." }
  }
}
