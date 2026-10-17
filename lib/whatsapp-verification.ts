import { randomInt } from "crypto"
import { createClient } from "@supabase/supabase-js"

export const VERIFICATION_TTL_MINUTES = 15
export const MAX_ATTEMPTS_PER_HOUR = 5

// No 0/O/1/I/L so the code survives being read aloud or retyped.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const CODE_LENGTH = 6
const CODE_PREFIX = "FJ-"

// Cheap pre-filter for the webhook: anything that doesn't contain this exact shape is dropped
// before touching the database.
export const CODE_PATTERN = new RegExp(`\\b${CODE_PREFIX}([${CODE_ALPHABET}]{${CODE_LENGTH}})\\b`)
export const MAX_MESSAGE_LENGTH = 300

export type VerificationStatus = "pending" | "received" | "confirmed" | "rejected" | "expired"

export function generateVerificationCode(): string {
  let code = CODE_PREFIX
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  }
  return code
}

export function extractVerificationCode(message: string): string | null {
  if (!message || message.length > MAX_MESSAGE_LENGTH) return null
  const match = message.toUpperCase().match(CODE_PATTERN)
  return match ? `${CODE_PREFIX}${match[1]}` : null
}

export function buildVerificationMessage(code: string): string {
  return `Olá! Quero validar meu número no FreeJob.\n\nCódigo: ${code}`
}

export function buildWhatsAppLink(code: string): string | null {
  const number = process.env.FREEJOB_WHATSAPP_NUMBER?.replace(/\D/g, "")
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(buildVerificationMessage(code))}`
}

export function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.slice(2, 4)
    const rest = digits.slice(4)
    const split = rest.length === 9 ? 5 : 4
    return `+55 (${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`
  }
  return `+${digits}`
}
