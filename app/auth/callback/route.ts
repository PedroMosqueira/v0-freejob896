import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const cookieStore = await cookies()

  console.log("[v0] ========== AUTH CALLBACK ==========")
  console.log("[v0] Full URL:", request.url)
  console.log("[v0] Code present:", !!code)
  console.log("[v0] Code length:", code?.length || 0)
  console.log("[v0] Error param:", error)
  console.log("[v0] NEXT_PUBLIC_SUPABASE_URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log("[v0] NEXT_PUBLIC_SUPABASE_ANON_KEY:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  // Se houver erro (ex: usuário cancelou OAuth)
  if (error) {
    console.error("[v0] ❌ Auth error:", error)
    return NextResponse.redirect(new URL("/", requestUrl.origin))
  }

  // Processar code de Magic Link ou OAuth
  if (code) {
    console.log("[v0] 🔄 Tentando fazer exchange do code...")
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error("[v0] ❌ Supabase credentials missing!")
      return NextResponse.redirect(new URL("/?error=config_missing", requestUrl.origin))
    }

    // Usar createServerClient para servidor
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // SSR context limitation
          }
        },
      },
    })

    try {
      console.log("[v0] 📡 Chamando exchangeCodeForSession...")
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error("[v0] ❌ Exchange error completo:", JSON.stringify(exchangeError, null, 2))
        console.error("[v0] ❌ Exchange error message:", exchangeError.message)
        console.error("[v0] ❌ Exchange error code:", exchangeError.code)
        return NextResponse.redirect(new URL("/?error=exchange_failed", requestUrl.origin))
      }

      console.log("[v0] ✅ Sessão criada para user:", data.user?.email)

      // Verificar/criar perfil do usuário no banco de dados
      if (data.user) {
        console.log("[v0] 👤 Verificando se usuário existe no banco...")
        const { data: existingUser, error: selectError } = await supabase
          .from("users")
          .select("id")
          .eq("id", data.user.id)
          .single()

        if (selectError && selectError.code !== "PGRST116") {
          console.error("[v0] ❌ Erro ao verificar usuário:", selectError)
        }

        // Se usuário não existe, criar perfil
        if (selectError && selectError.code === "PGRST116") {
          console.log("[v0] 📝 Criando novo perfil para:", data.user.email)
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
            console.error("[v0] ❌ Erro ao criar perfil:", insertError)
          } else {
            console.log("[v0] ✅ Novo perfil criado para:", data.user.email)
          }
        }
      }

      // Redirecionar para home
      console.log("[v0] 🚀 Redirecionando para home...")
      return NextResponse.redirect(new URL("/", requestUrl.origin))
    } catch (err) {
      console.error("[v0] ❌ Callback error:", err instanceof Error ? err.message : err)
      return NextResponse.redirect(new URL("/?error=auth_failed", requestUrl.origin))
    }
  }

  // Para OAuth (Google, GitHub, etc), Supabase retorna tudo no hash
  // O cliente (navegador) precisa processar isso via JavaScript
  // Esta rota é mais para Magic Link que usa query string com 'code'
  
  console.log("[v0] ❌ Nenhum code ou error - retornando para home")
  return NextResponse.redirect(new URL("/", requestUrl.origin))
}
