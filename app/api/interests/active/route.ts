import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Buscar usuário
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Contar interesses ativos (status = 'pending' ou 'viewed')
    const { data: interests, error: interestsError, count } = await supabase
      .from("professional_interests")
      .select("*", { count: "exact" })
      .eq("professional_id", user.id)
      .in("status", ["pending", "viewed"])

    if (interestsError) {
      console.error("[v0] Error fetching active interests:", interestsError)
      return NextResponse.json({ error: "Failed to fetch interests" }, { status: 500 })
    }

    return NextResponse.json({
      count: count || 0,
      email,
      userId: user.id,
    })
  } catch (error) {
    console.error("[v0] Error in GET /api/interests/active:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
