import { createHmac, timingSafeEqual } from "crypto"
import { type NextRequest, NextResponse } from "next/server"

interface ResendEvent {
  type: string
  created_at: string
  data: {
    email_id: string
    to: string | string[]
    reason?: string
  }
}

const MAX_CLOCK_SKEW_SECONDS = 5 * 60

// Resend signs webhooks with Svix: HMAC-SHA256 over "id.timestamp.body", keyed by the
// base64 part of the "whsec_..." secret from the Resend dashboard.
function isValidSignature(secret: string, id: string, timestamp: string, body: string, header: string) {
  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest()

  return header.split(" ").some((part) => {
    const [version, signature] = part.split(",")
    if (version !== "v1" || !signature) return false
    const received = Buffer.from(signature, "base64")
    return received.length === expected.length && timingSafeEqual(received, expected)
  })
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  const id = request.headers.get("svix-id")
  const timestamp = request.headers.get("svix-timestamp")
  const signature = request.headers.get("svix-signature")
  const rawBody = await request.text()

  if (!secret || !id || !timestamp || !signature || !isValidSignature(secret, id, timestamp, rawBody, signature)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 })
  }

  let event: ResendEvent
  try {
    event = JSON.parse(rawBody) as ResendEvent
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 })
  }

  if (["email.bounced", "email.complained", "email.failed"].includes(event.type)) {
    console.warn("[resend-webhook]", event.type, event.data?.email_id, event.data?.reason ?? "")
  }

  return NextResponse.json({ received: true })
}
