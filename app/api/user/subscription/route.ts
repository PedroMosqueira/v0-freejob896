import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserSubscription } from "@/lib/subscription-manager"

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.email) {
      return NextResponse.json({ plan: "free", is_active: false }, { status: 200 })
    }

    const subscription = await getUserSubscription(session.user.email)

    if (!subscription) {
      return NextResponse.json({ plan: "free", is_active: false }, { status: 200 })
    }

    return NextResponse.json(subscription, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in subscription route:", error)
    return NextResponse.json({ plan: "free", is_active: false }, { status: 200 })
  }
}
