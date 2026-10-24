import { createHash, randomBytes } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/whatsapp-verification"
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const MAX_IMAGE_CHARS = 1_500_000
const IMAGE_PREFIX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

const draftSchema = z.object({
  title: optionalText(120),
  description: optionalText(2000),
  category: optionalText(60),
  city: optionalText(80),
  state: optionalText(40),
  neighborhood: optionalText(80),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isRemote: z.boolean().optional(),
  images: z.array(z.string().max(MAX_IMAGE_CHARS).regex(IMAGE_PREFIX)).max(4).default([]),
})

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limit = await checkRateLimit([
    { key: `pending-request:ip:${ip}`, limit: 10, windowSeconds: 10 * 60 },
    { key: `pending-request:ip-day:${ip}`, limit: 40, windowSeconds: 24 * 60 * 60 },
  ])
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const parsed = draftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const { images, ...payload } = parsed.data
  if (!payload.title && !payload.description) {
    return NextResponse.json({ error: "Descreva o serviço antes de continuar." }, { status: 400 })
  }

  const token = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("pending_requests")
    .insert({ token_hash: tokenHash, payload, images })
    .select("id")
    .single()

  if (error || !data) {
    console.error("Erro ao salvar rascunho de pedido:", error?.message)
    return NextResponse.json({ error: "Não foi possível guardar o pedido." }, { status: 500 })
  }

  await supabase
    .from("pending_requests")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .then(
      () => undefined,
      () => undefined,
    )

  return NextResponse.json({ id: data.id, token })
}
