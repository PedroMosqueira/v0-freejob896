import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")

  console.log("[v0] Auth callback - code:", !!code, "error:", error)

  // Se houver erro (ex: usuário cancelou OAuth)
  if (error) {
    console.error("[v0] Auth error:", error)
    return NextResponse.redirect(new URL("/", requestUrl.origin))
  }

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    )

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error("[v0] Exchange error:", exchangeError)
        return NextResponse.redirect(new URL("/?error=exchange_failed", requestUrl.origin))
      }

      console.log("[v0] Sessão criada para user:", data.user?.email)

      // Verificar/criar perfil do usuário no banco de dados
      if (data.user) {
        const { data: existingUser, error: selectError } = await supabase
          .from("users")
          .select("id")
          .eq("id", data.user.id)
          .single()

        if (selectError && selectError.code !== "PGRST116") {
          console.error("[v0] Erro ao verificar usuário:", selectError)
        }

        // Se usuário não existe, criar perfil
        if (selectError && selectError.code === "PGRST116") {
          const { error: insertError } = await supabase.from("users").insert({
            id: data.user.id,
            email: data.user.email || "",
            full_name: data.user.user_metadata?.full_name || "",
            first_name: data.user.user_metadata?.full_name?.split(" ")[0] || "",
            last_name: data.user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
            profile_image_url: data.user.user_metadata?.avatar_url || "",
            verified_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

          if (insertError) {
            console.error("[v0] Erro ao criar perfil:", insertError)
            // Continuar mesmo se falhar (usuário foi criado no Auth)
          } else {
            console.log("[v0] Novo perfil criado para:", data.user.email)
          }
        }
      }

      // Redirecionar para dashboard
      return NextResponse.redirect(new URL("/dashboard", requestUrl.origin))
    } catch (err) {
      console.error("[v0] Callback error:", err)
      return NextResponse.redirect(new URL("/?error=auth_failed", requestUrl.origin))
    }
  }

  // Se não há code nem error
  return NextResponse.redirect(new URL("/", requestUrl.origin))
}
