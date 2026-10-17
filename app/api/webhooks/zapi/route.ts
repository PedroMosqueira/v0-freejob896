import { NextResponse } from "next/server"
import { createServiceClient, extractVerificationCode } from "@/lib/whatsapp-verification"

interface ZapiReceivedCallback {
  type?: string
  instanceId?: string
  phone?: string
  fromMe?: boolean
  isGroup?: boolean
  isNewsletter?: boolean
  broadcast?: boolean
  text?: { message?: string }
}

// Always answer 200 quickly: Z-API retries on errors, and messages that aren't
// verification codes should cost nothing beyond parsing the body.
const ignored = () => NextResponse.json({ ok: true })

export async function POST(request: Request) {
  let body: ZapiReceivedCallback
  try {
    body = await request.json()
  } catch {
    return ignored()
  }

  // Z-API doesn't sign webhooks; the instance id is private, so it acts as the shared secret.
  if (!process.env.Z_API_INSTANCE_ID || body.instanceId !== process.env.Z_API_INSTANCE_ID) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  if (body.type !== "ReceivedCallback" || body.fromMe || body.isGroup || body.isNewsletter || body.broadcast) {
    return ignored()
  }

  const code = extractVerificationCode(body.text?.message ?? "")
  if (!code) return ignored()

  // Contacts that WhatsApp only exposes by LID ("...@lid") have no usable number.
  const phone = body.phone?.trim() ?? ""
  if (!/^\d{10,15}$/.test(phone)) return ignored()

  const admin = createServiceClient()
  await admin
    .from("whatsapp_phone_verifications")
    .update({ status: "received", phone, received_at: new Date().toISOString() })
    .eq("code", code)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())

  return ignored()
}
