import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] Plans API called")
    const supabase = createSupabaseServerClient()
    console.log("[v0] Supabase client created")

    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("id, name, slug, description, price_monthly, price_annual, features, is_active")
      .eq("is_active", true)
      .order("price_monthly", { ascending: true })

    console.log("[v0] Supabase query completed. Error:", error, "Data:", plans)

    if (error) {
      console.error("[v0] Error fetching plans:", error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    console.log("[v0] Returning plans:", plans)
    return NextResponse.json({
      plans: plans || [],
    })
  } catch (error) {
    console.error("[v0] Error in plans API:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
