import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/whatsapp-verification"
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const PREVIEW_LIMIT = 4

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

  const rawCategory = request.nextUrl.searchParams.get("category")?.trim() ?? ""
  const category = rawCategory.length > 0 && rawCategory.length <= 60 ? rawCategory : null

  const supabase = createServiceClient()
  let needsQuery = supabase
    .from("needs")
    .select("id, title, category, city, state, neighborhood, images, created_at")
    .eq("status", "aberto")
    .order("created_at", { ascending: false })
    .limit(PREVIEW_LIMIT)
  if (category) needsQuery = needsQuery.eq("category", category)

  const [{ data, error }, { data: categoryRows }] = await Promise.all([
    needsQuery,
    supabase
      .from("needs")
      .select("category")
      .eq("status", "aberto")
      .order("created_at", { ascending: false })
      .limit(500),
  ])

  if (error) {
    console.error("Erro ao carregar prévia pública de serviços:", error.message)
    return NextResponse.json({ needs: [], categories: [] }, { status: 500 })
  }

  const categoryCounts = new Map<string, number>()
  for (const row of categoryRows ?? []) {
    if (row.category) categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1)
  }
  const categories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, 12)
    .map(([name]) => name)

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
    { needs, categories },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  )
}
