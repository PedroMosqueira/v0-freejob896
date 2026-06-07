import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()

    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("id, name, slug, description, price_monthly, price_annual, features, is_active")
      .eq("is_active", true)
      .order("price_monthly", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching plans:", error)
      return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 })
    }

    return NextResponse.json({
      plans: plans || [],
    })
  } catch (error) {
    console.error("[v0] Error in plans API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
