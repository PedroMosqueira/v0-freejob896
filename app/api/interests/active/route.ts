import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Active interests API called")
    const email = request.nextUrl.searchParams.get("email")
    console.log("[v0] Email parameter:", email)

    if (!email) {
      console.warn("[v0] Missing email parameter")
      return NextResponse.json({ error: "Email is required", count: 0 }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    console.log("[v0] Supabase client created")

    // Buscar usuário
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    console.log("[v0] User query result. Error:", userError, "User:", user)

    if (userError || !user) {
      console.warn("[v0] User not found:", userError)
      return NextResponse.json({ error: "User not found", count: 0 }, { status: 404 })
    }

    // Contar interesses ativos (status = 'pending' ou 'viewed')
    const { data: interests, error: interestsError, count } = await supabase
      .from("professional_interests")
      .select("*", { count: "exact" })
      .eq("professional_id", user.id)
      .in("status", ["pending", "viewed"])

    console.log("[v0] Interests query result. Error:", interestsError, "Count:", count, "Data:", interests)

    if (interestsError) {
      console.error("[v0] Error fetching active interests:", interestsError)
      return NextResponse.json({ error: interestsError.message, count: 0 }, { status: 500 })
    }

    console.log("[v0] Returning count:", count)
    return NextResponse.json({
      count: count || 0,
      email,
      userId: user.id,
    })
  } catch (error) {
    console.error("[v0] Error in GET /api/interests/active:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error", count: 0 }, { status: 500 })
  }
}
