"use server"

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
  const email = formData.get("email")
  const password = formData.get("password")
  const confirmPassword = formData.get("confirmPassword")
  const firstName = formData.get("firstName")
  const lastName = formData.get("lastName")
  const phone = formData.get("phone")
  const city = formData.get("city")
  const bio = formData.get("bio")
  const isProfessional = formData.get("isProfessional") === "true"
  const cpf = formData.get("cpf")
  const professionalPhone = formData.get("professionalPhone")

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
    const { data, error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo: "https://freejob.online/auth/callback",
      },
    })

    if (error) {
      // Check for duplicate email
      if (
        error.message.includes("already registered") ||
        error.message.includes("User already registered") ||
        error.message.toLowerCase().includes("unique") ||
        error.message.toLowerCase().includes("duplicate") ||
        error.status === 422
      ) {
        return {
          error: "Este email já possui uma conta cadastrada. Escolha outro email ou use 'Verificar Status' para recuperar sua conta.",
          showStatusCheck: true,
          email: email.toString(),
          isDuplicateEmail: true,
        }
      }

      if (error.message.includes("rate limit") || error.message.includes("too many") || error.status === 429) {
        return {
          error: "Muitas tentativas de cadastro. Aguarde alguns minutos antes de tentar novamente. Use 'Verificar Status' para mais detalhes.",
          rateLimited: true,
          showStatusCheck: true,
          email: email.toString(),
        }
      }

      return { error: error.message }
    }

    // Verificação adicional: se o usuário foi criado mas o email pode não ter sido enviado
    if (data?.user && data?.user?.email_confirmed_at === null) {
      // Salvar dados pessoais na tabela users
      try {
        const { error: updateError } = await supabase
          .from("users")
          .update({
            first_name: firstName?.toString() || null,
            last_name: lastName?.toString() || null,
            full_name: `${firstName?.toString() || ""} ${lastName?.toString() || ""}`.trim() || null,
            phone: phone?.toString() || null,
            city: city?.toString() || null,
            bio: bio?.toString() || null,
            is_professional: isProfessional,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.user.id)

        if (updateError) {
          console.error("Erro ao salvar dados pessoais:", updateError)
          // Não falhar o signup por causa disso
        }

        // Se é profissional, salvar dados profissionais também
        if (isProfessional && cpf) {
          // Salvar CPF, telefone profissional e inicializar contador de propostas
          const { error: professionalError } = await supabase
            .from("users")
            .update({
              cpf: cpf?.toString() || null,
              professional_phone: professionalPhone?.toString() || null,
              free_interests_remaining: 3, // Inicializa com 3 propostas gratuitas
              total_interests_sent: 0,
              has_received_free_credits: false, // Ainda não recebeu os créditos
            })
            .eq("id", data.user.id)

          if (professionalError) {
            console.error("Erro ao salvar dados profissionais:", professionalError)
          }
        }
      } catch (profileError) {
        console.error("Erro ao criar perfil:", profileError)
        // Não falhar o signup por causa disso
      }
    }

    return {
      success: "Verifique seu email! Enviamos um link de confirmação. O link expira em 1 hora.",
      email: email.toString(),
    }
  } catch (error) {
    console.error("Erro durante signup:", error)
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
    console.log("[v0] ========== RESEND EMAIL INICIADO ==========")
    console.log("[v0] Timestamp:", new Date().toISOString())
    console.log("[v0] Email para reenvio:", email.toString())
    console.log("[v0] URL base do Supabase:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...")

    // Use REST API diretamente para reenviar email sem necessidade de sessão
    console.log("[v0] Fazendo chamada REST API: /auth/v1/resend")
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/resend`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({
          type: "signup",
          email: email.toString(),
          redirect_to: "https://freejob.online/auth/callback",
        }),
      },
    )

    console.log("[v0] ✓ Response recebido do servidor")
    console.log("[v0] Status HTTP:", response.status)
    console.log("[v0] Headers:", Object.fromEntries(response.headers.entries()))

    const data = await response.json()
    console.log("[v0] Body da resposta:", JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error("[v0] ❌ ========== ERRO NO RESEND ==========")
      console.error("[v0] Status HTTP de erro:", response.status)
      console.error("[v0] Mensagem de erro:", data.message || data.error)
      console.error("[v0] Código de erro:", data.error_code)
      console.error("[v0] Resposta completa:", JSON.stringify(data, null, 2))

      if (data.error_code === "rate_limit_exceeded" || data.message?.includes("rate limit") || data.message?.includes("too many") || response.status === 429) {
        console.log("[v0] 🟡 TIPO: RATE LIMIT")
        console.log("[v0] Possíveis causas:")
        console.log("[v0]   1. Muitos reenvios do mesmo email")
        console.log("[v0]   2. Limite de Resend atingido (100/dia)")
        console.log("[v0]   3. Limite de IP atingido")
        return {
          error: "Limite de reenvios atingido. Aguarde alguns minutos antes de tentar novamente.",
          rateLimited: true,
          email: email.toString(),
        }
      }

      if (data.message?.includes("already confirmed")) {
        console.log("[v0] ✓ Email já foi confirmado")
        return { success: "Email já confirmado. Você pode fazer login agora." }
      }

      if (data.message?.includes("not found") || data.message?.includes("User not found")) {
        console.log("[v0] 🔴 Usuário não encontrado")
        console.log("[v0] Possível causa: Email foi deletado ou nunca foi registrado")
        return { 
          error: "Usuário não encontrado. Verifique o email ou registre-se novamente.",
          email: email.toString()
        }
      }

      console.log("[v0] ⚠️ Outro erro:", data.message || data.error)
      return { error: data.message || "Erro ao reenviar email" }
    }

    console.log("[v0] ✅ ========== RESEND BEM-SUCEDIDO! ==========")
    console.log("[v0] Email reenviado para:", email.toString())
    console.log("[v0] Próximo passo: Usuário deve verificar email de confirmação")

    return { 
      success: "Email de verificação reenviado com sucesso! Verifique sua caixa de entrada e pasta de spam." 
    }
  } catch (error) {
    console.error("[v0] ❌ ========== ERRO NÃO TRATADO NO RESEND ==========")
    console.error("[v0] Tipo de erro:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("[v0] Mensagem:", error instanceof Error ? error.message : String(error))
    console.error("[v0] Stack trace:", error instanceof Error ? error.stack : "N/A")
    return { error: "Erro inesperado ao reenviar email. Tente novamente." }
  }
}
