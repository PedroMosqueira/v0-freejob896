import { createHash } from "node:crypto"
import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/whatsapp-verification"
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit"
import { addNeed } from "@/lib/needs-store"

export const dynamic = "force-dynamic"

const claimSchema = z.object({
  id: z.string().uuid(),
  token: z.string().min(20).max(100),
})

interface DraftPayload {
  title?: string
  description?: string
  category?: string
  city?: string
  state?: string
  neighborhood?: string
  latitude?: number
  longitude?: number
}

function isPublishable(payload: DraftPayload) {
  return Boolean(payload.title && payload.category && payload.city && payload.state)
}

async function uploadDraftImages(draftId: string, images: string[]) {
  const urls: string[] = []
  for (const [index, dataUrl] of images.entries()) {
    const match = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(dataUrl)
    if (!match) continue
    try {
      const extension = match[2] === "jpeg" ? "jpg" : match[2]
      const blob = await put(
        `needs/pending-${draftId}/${Date.now()}-${index}.${extension}`,
        Buffer.from(match[3], "base64"),
        { access: "public", contentType: match[1] },
      )
      urls.push(blob.url)
    } catch (error) {
      console.error("Erro ao enviar foto do rascunho:", error)
    }
  }
  return urls
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: "Faça login para publicar." }, { status: 401 })
  }

  const limit = await checkRateLimit([{ key: `pending-claim:user:${user.id}`, limit: 20, windowSeconds: 60 * 60 }])
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds)

  const parsed = claimSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ status: "not_found" }, { status: 404 })
  }

  const service = createServiceClient()
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex")

  // Claiming atomically guarantees the draft is published once even if two tabs log in at the same time.
  const { data: draft } = await service
    .from("pending_requests")
    .update({ claimed_at: new Date().toISOString(), claimed_by: user.id })
    .eq("id", parsed.data.id)
    .eq("token_hash", tokenHash)
    .is("claimed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("payload, images")
    .maybeSingle()

  if (!draft) {
    return NextResponse.json({ status: "not_found" }, { status: 404 })
  }

  const payload = (draft.payload ?? {}) as DraftPayload
  const images = Array.isArray(draft.images) ? (draft.images as string[]) : []

  if (!isPublishable(payload)) {
    return NextResponse.json({ status: "incomplete", draft: { ...payload, images } })
  }

  try {
    const imageUrls = await uploadDraftImages(parsed.data.id, images)
    const need = await addNeed({
      title: payload.title!,
      description: payload.description,
      category: payload.category!,
      city: payload.city!,
      state: payload.state!,
      neighborhood: payload.neighborhood,
      latitude: payload.latitude,
      longitude: payload.longitude,
      requesterEmail: user.email,
      images: imageUrls,
    })

    await service
      .from("pending_requests")
      .update({ need_id: need.id, images: [] })
      .eq("id", parsed.data.id)

    return NextResponse.json({ status: "published", needId: need.id, title: need.title })
  } catch (error) {
    console.error("Erro ao publicar rascunho:", error)
    return NextResponse.json({ status: "failed", draft: { ...payload, images } })
  }
}
