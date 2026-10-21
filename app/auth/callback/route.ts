import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { ensureUserProfile } from "@/lib/ensure-user-profile"

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

      if (data.user) {
        const profile = await ensureUserProfile(data.user)
        if (!profile.ok) {
          console.error("[v0] ❌ Erro ao criar perfil:", profile.error)
          return NextResponse.redirect(new URL("/?error=profile_failed", requestUrl.origin))
        }
      }

      const homeUrl = new URL("/", requestUrl.origin)
      const pending = requestUrl.searchParams.get("pending")
      if (pending && /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{20,100}$/.test(pending)) {
        homeUrl.searchParams.set("pending", pending)
      }
      return NextResponse.redirect(homeUrl)
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
