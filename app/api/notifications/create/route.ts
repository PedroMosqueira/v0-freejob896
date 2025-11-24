import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getServerSession } from "next-auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { recipientEmail, title, message, type, needId, proposalId } = body

    console.log("[v0] 🔔 API: Creating notification for:", recipientEmail)
    console.log("[v0] 🔔 API: Notification data:", { title, message, type })

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: recipientEmail,
        title,
        message,
        type,
        related_need_id: needId || null,
        related_proposal_id: proposalId || null,
        is_read: false,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] ❌ API: Error creating notification:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] ✅ API: Notification created successfully:", data.id)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] ❌ API: Exception creating notification:", error)
    return NextResponse.json(
      { error: "Erro ao criar notificação" },
      { status: 500 }
    )
  }
}
