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
      return NextResponse.json({ count: 0 }, { status: 200 })
    }

    try {
      const supabase = await createSupabaseServerClient()
      console.log("[v0] Supabase client created")

      // Buscar usuário
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single()

      console.log("[v0] User query result. Error:", userError?.message, "User ID:", user?.id)

      if (userError || !user) {
        console.warn("[v0] User not found or error:", userError?.message)
        return NextResponse.json({ count: 0 }, { status: 200 })
      }

      // Contar interesses ativos (status = 'pending' ou 'viewed')
      const { count, error: countError } = await supabase
        .from("professional_interests")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", user.id)
        .in("status", ["pending", "viewed"])

      console.log("[v0] Count query result. Count:", count, "Error:", countError?.message)

      if (countError) {
        console.warn("[v0] Error counting interests (might be permission issue):", countError.message)
        // Return 0 instead of error - table might not have permission or not exist
        return NextResponse.json({ count: 0 }, { status: 200 })
      }

      console.log("[v0] Returning count:", count)
      return NextResponse.json({ count: count || 0 }, { status: 200 })
    } catch (innerError) {
      console.error("[v0] Error in Supabase operations:", innerError instanceof Error ? innerError.message : String(innerError))
      // Return 0 on any Supabase error to prevent breaking the frontend
      return NextResponse.json({ count: 0 }, { status: 200 })
    }
  } catch (error) {
    console.error("[v0] Error in GET /api/interests/active:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
}
