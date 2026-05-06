import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const error = requestUrl.searchParams.get("error")
  const error_description = requestUrl.searchParams.get("error_description")
  const type = requestUrl.searchParams.get("type")

  if (error) {
    if (error === "access_denied" && error_description?.includes("expired")) {
      return NextResponse.redirect(new URL("/?error=Link expirado. Faça um novo cadastro.", requestUrl.origin))
    }

    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin),
    )
  }

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL("/?error=Código de verificação não encontrado", requestUrl.origin))
  }

  try {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options })
          },
        },
      },
    )

    let data: any
    let exchangeError: any

    if (tokenHash && type === "recovery") {
      const result = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      })
      data = result.data
      exchangeError = result.error
    } else if (code) {
      const result = await supabase.auth.exchangeCodeForSession(code)
      data = result.data
      exchangeError = result.error
    }

    if (exchangeError) {
      if (exchangeError.message.includes("expired") || exchangeError.message.includes("invalid")) {
        return NextResponse.redirect(new URL("/?error=Link expirado. Solicite um novo link.", requestUrl.origin))
      }

      return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin))
    }

    if (!data.user) {
      return NextResponse.redirect(new URL("/?error=Dados do usuário não encontrados", requestUrl.origin))
    }

    const isPasswordRecovery = type === "recovery" || !!tokenHash

    if (isPasswordRecovery) {
      return NextResponse.redirect(new URL("/auth/reset-password", requestUrl.origin))
    }

    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options })
          },
        },
      },
    )

    const { data: existingUser, error: checkError } = await serviceSupabase
      .from("users")
      .select("id")
      .eq("email", data.user.email)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[v0] [CALLBACK] Error checking existing user:", checkError)
    }

    if (!existingUser) {
      const { data: newUser, error: insertError } = await serviceSupabase
        .from("users")
        .insert({
          id: data.user.id,
          email: data.user.email,
          password_hash: null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        console.error("[v0] [CALLBACK] Error creating user in custom table:", insertError)
        return NextResponse.redirect(
          new URL("/?error=Erro ao criar usuário. Entre em contato com o suporte.", requestUrl.origin),
        )
      }
    }

    if (!existingUser) {
      console.log("[v0] [CALLBACK] Creating new user in custom table...")

      const { data: newUser, error: insertError } = await serviceSupabase
        .from("users")
        .insert({
          id: data.user.id,
          email: data.user.email,
          password_hash: null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      console.log("[v0] User insert result:", { success: !!newUser, error: insertError?.message })

      if (insertError) {
        console.error("[v0] [CALLBACK] Error creating user in custom table:", insertError)
        console.error("[v0] [CALLBACK] Insert error details:", JSON.stringify(insertError, null, 2))
        return NextResponse.redirect(
          new URL("/?error=Erro ao criar usuário. Entre em contato com o suporte.", requestUrl.origin),
        )
      }

      console.log("[v0] ✅ [CALLBACK] User created in custom table:", data.user.email)
      console.log("✅ [CALLBACK] New user data:", newUser)
    } else {
      console.log("ℹ️ [CALLBACK] User already exists in custom table:", data.user.email)
    }

    console.log("🔐 [CALLBACK] Setting session cookies for automatic login...")

    const response = NextResponse.redirect(
      new URL(
        "/?verified=true&message=Email verificado com sucesso! Você foi logado automaticamente.",
        requestUrl.origin,
      ),
    )

    if (data.session) {
      const maxAge = 100 * 365 * 24 * 60 * 60
      response.cookies.set("sb-access-token", data.session.access_token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: maxAge,
      })
      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: maxAge,
      })
    }

    return response
  } catch (error) {
    console.error("💥 [CALLBACK] Unexpected error:", error)
    return NextResponse.redirect(
      new URL("/?error=Erro na verificação. Tente fazer um novo cadastro.", requestUrl.origin),
    )
  }
}
