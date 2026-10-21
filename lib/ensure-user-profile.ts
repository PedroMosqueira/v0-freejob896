import type { User } from "@supabase/supabase-js"
import { createServiceClient } from "@/lib/whatsapp-verification"

// Profiles are created with the service role: the insert fires a trigger that writes
// to user_subscriptions, which end users are not allowed to write to under RLS.
export async function ensureUserProfile(user: Pick<User, "id" | "email" | "user_metadata">) {
  if (!user.email) return { ok: false as const, error: "Conta sem e-mail" }

  const supabase = createServiceClient()
  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  if (selectError) return { ok: false as const, error: selectError.message }
  if (existing) return { ok: true as const, created: false }

  const metadata = user.user_metadata ?? {}
  const fullName: string = (metadata.full_name || metadata.name || "").trim()
  const now = new Date().toISOString()

  const { error: insertError } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName,
      first_name: fullName.split(" ")[0] || "",
      last_name: fullName.split(" ").slice(1).join(" ") || "",
      profile_image_url: metadata.avatar_url || metadata.picture || "",
      verified_at: now,
      created_at: now,
      updated_at: now,
    },
    { onConflict: "id", ignoreDuplicates: true },
  )

  if (insertError) return { ok: false as const, error: insertError.message }
  return { ok: true as const, created: true }
}
