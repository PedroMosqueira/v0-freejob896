import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/whatsapp-verification"

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const { data } = await createServiceClient()
      .from("users")
      .select("cashback_balance, total_cashback_earned")
      .eq("email", user.email)
      .single()

    return NextResponse.json({
      balance: data?.cashback_balance ?? 0,
      totalEarned: data?.total_cashback_earned ?? 0,
      nextPlanPrice: 0,
    })
  } catch (error) {
    console.error("[v0] Error fetching cashback balance:", error)
    return NextResponse.json({ balance: 0, totalEarned: 0, nextPlanPrice: 0 })
  }
}
