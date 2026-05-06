import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  console.log("[v0] ========== MIDDLEWARE ==========")
  console.log("[v0] Path:", url.pathname)
  console.log("[v0] Search params:", url.searchParams.toString())

  // Permitir que /auth/callback seja acessado diretamente pelo Supabase
  if (url.pathname === "/auth/callback") {
    console.log("[v0] ✅ Auth callback route - passing through")
    return NextResponse.next()
  }

  if (url.pathname.startsWith("/auth/reset-password")) {
    console.log("[v0] ✅ Reset password route - passing through")
    return NextResponse.next()
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
