import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/whatsapp-verification"
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export interface PublicNeedPreview {
  id: string
  title: string
  category: string
  city: string | null
  state: string | null
  neighborhood: string | null
  image: string | null
  createdAt: string
}

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit([
    { key: `public-needs:ip:${getClientIp(request)}`, limit: 60, windowSeconds: 10 * 60 },
  ])
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds)

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("needs")
    .select("id, title, category, city, state, neighborhood, images, created_at")
    .eq("status", "aberto")
    .order("created_at", { ascending: false })
    .limit(8)

  if (error) {
    console.error("Erro ao carregar prévia pública de serviços:", error.message)
    return NextResponse.json({ needs: [] }, { status: 500 })
  }

  const needs: PublicNeedPreview[] = (data ?? []).map((need) => ({
    id: need.id,
    title: need.title,
    category: need.category,
    city: need.city,
    state: need.state,
    neighborhood: need.neighborhood,
    image: Array.isArray(need.images) && need.images.length > 0 ? need.images[0] : null,
    createdAt: need.created_at,
  }))

  return NextResponse.json(
    { needs },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  )
}
