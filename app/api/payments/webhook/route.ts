import type { NextRequest } from "next/server"
import { handleStripeWebhook } from "@/lib/stripe-webhook-handler"

// Legacy URL kept so an endpoint already registered in Stripe keeps working.
export async function POST(req: NextRequest) {
  return handleStripeWebhook(req)
}
