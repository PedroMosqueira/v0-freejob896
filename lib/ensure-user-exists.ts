import { createClient } from "@supabase/supabase-js"

export async function ensureUserExists(email: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Verificar se usuário existe
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .single()

    if (existingUser) {
      console.log("[v0] Usuário já existe:", email)
      return existingUser
    }

    // Se não existe, criar novo usuário
    console.log("[v0] Criando novo usuário:", email)
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        email: email,
        is_professional: false,
        is_client: true,
        free_interests_remaining: 3,
        total_interests_sent: 0,
        total_services: 0,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Erro ao criar usuário:", insertError)
      throw insertError
    }

    console.log("[v0] Usuário criado com sucesso:", newUser.id)
    return newUser
  } catch (error) {
    console.error("[v0] Erro em ensureUserExists:", error)
    throw error
  }
}
