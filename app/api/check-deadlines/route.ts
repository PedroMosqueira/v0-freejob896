import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { DEADLINES } from "@/lib/plan-limits"

// Meant for a scheduled job (e.g. Vercel Cron). Requests are never suspended
// here: unanswered interests and bids stay valid and the professional decides
// whether to withdraw (see lib/withdraw-policy.ts).
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()

  const { data: completedServices, error } = await supabase
    .from("need_proposals")
    .select("id, need_id")
    .eq("completion_status", "completed")
    .is("confirmed_by_client_at", null)
    .lt(
      "completed_by_professional_at",
      new Date(now.getTime() - DEADLINES.AUTO_CONFIRM_HOURS * 60 * 60 * 1000).toISOString(),
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  for (const service of completedServices || []) {
    await supabase
      .from("need_proposals")
      .update({ completion_status: "confirmed", confirmed_by_client_at: now.toISOString() })
      .eq("id", service.id)

    await supabase.from("needs").update({ status: "concluido" }).eq("id", service.need_id)
  }

  return NextResponse.json({
    success: true,
    processed: { autoConfirmed: completedServices?.length || 0 },
  })
}
