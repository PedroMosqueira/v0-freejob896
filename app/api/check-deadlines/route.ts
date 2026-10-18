import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { DEADLINES } from "@/lib/plan-limits"

// Called daily by Vercel Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`.
// Requests are never suspended here: unanswered interests and bids stay valid and the
// professional decides whether to withdraw (see lib/withdraw-policy.ts).
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  // The cron has no user session, so a cookie-based client would be blocked by RLS.
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
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

  let autoConfirmed = 0
  for (const service of completedServices || []) {
    const { error: proposalError } = await supabase
      .from("need_proposals")
      .update({ completion_status: "confirmed", confirmed_by_client_at: now.toISOString() })
      .eq("id", service.id)
    if (proposalError) {
      console.error("[check-deadlines] Failed to confirm proposal", service.id, proposalError.message)
      continue
    }

    await supabase.from("needs").update({ status: "concluido" }).eq("id", service.need_id)
    autoConfirmed++
  }

  return NextResponse.json({ success: true, processed: { autoConfirmed } })
}
