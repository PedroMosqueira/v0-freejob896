import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  console.log("[v0] ========== MIDDLEWARE ==========")
  console.log("[v0] Path:", url.pathname)
  console.log("[v0] Search params:", url.searchParams.toString())
  console.log("[v0] Has code:", url.searchParams.has("code"))
  console.log("[v0] Has token:", url.searchParams.has("token"))

  if (url.pathname.startsWith("/auth/reset-password")) {
    console.log("[v0] ✅ Reset password route - passing through")
    return NextResponse.next()
  }

  // Se está na raiz e tem parâmetros de auth do Supabase, redireciona para callback
  if (url.pathname === "/" && (url.searchParams.has("code") || url.searchParams.has("token"))) {
    const type = url.searchParams.get("type")
    const code = url.searchParams.get("code") || url.searchParams.get("token")

    console.log("[v0] 🚨🚨🚨 MIDDLEWARE REDIRECT - Type:", type, "Code present:", !!code)

    // Redireciona para o callback mantendo todos os parâmetros
    url.pathname = "/auth/callback"
    console.log("[v0] Redirecting to:", url.toString())
    return NextResponse.redirect(url)
  }

  console.log("[v0] Middleware passing through")
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
