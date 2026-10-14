"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "1025802888946-3imd1ap0ovfdh1immv16m6n7eifurgcg.apps.googleusercontent.com"

type GoogleCredentialResponse = { credential: string }

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    nonce: string
    ux_mode?: "popup" | "redirect"
    use_fedcm_for_prompt?: boolean
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon"
      theme?: "outline" | "filled_blue" | "filled_black"
      size?: "large" | "medium" | "small"
      text?: "signin_with" | "signup_with" | "continue_with" | "signin"
      shape?: "rectangular" | "pill" | "circle" | "square"
      logo_alignment?: "left" | "center"
      width?: number
      locale?: string
    },
  ) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

async function createNoncePair() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return { raw, hashed }
}

interface GoogleSignInButtonProps {
  onError: (message: string) => void
  onLoadingChange: (loading: boolean) => void
}

// Renders Google's own button on our domain, so the account chooser says
// "Prosseguir para freejob.services" instead of the Supabase project URL.
export function GoogleSignInButton({ onError, onLoadingChange }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scriptReady, setScriptReady] = useState(false)

  useEffect(() => {
    if (window.google?.accounts?.id) setScriptReady(true)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const googleId = window.google?.accounts?.id
    if (!scriptReady || !container || !googleId) return

    let cancelled = false

    createNoncePair().then(({ raw, hashed }) => {
      if (cancelled) return

      googleId.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hashed,
        ux_mode: "popup",
        callback: async ({ credential }) => {
          onLoadingChange(true)
          onError("")
          try {
            const supabase = createSupabaseBrowserClient()
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: credential,
              nonce: raw,
            })
            if (error) throw error

            const user = data.user
            if (user) {
              const { data: existing } = await supabase.from("users").select("id").eq("id", user.id).maybeSingle()
              if (!existing) {
                const fullName: string = user.user_metadata?.full_name || user.user_metadata?.name || ""
                const now = new Date().toISOString()
                await supabase.from("users").insert({
                  id: user.id,
                  email: user.email || "",
                  full_name: fullName,
                  first_name: fullName.split(" ")[0] || "",
                  last_name: fullName.split(" ").slice(1).join(" ") || "",
                  profile_image_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
                  verified_at: now,
                  created_at: now,
                  updated_at: now,
                })
              }
            }

            window.location.assign("/")
          } catch (err) {
            console.error("Erro no login com Google:", err)
            onError("Não foi possível entrar com Google. Tente novamente.")
            onLoadingChange(false)
          }
        },
      })

      container.innerHTML = ""
      googleId.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "center",
        width: Math.min(Math.max(container.offsetWidth, 200), 400),
        locale: "pt-BR",
      })
    })

    return () => {
      cancelled = true
    }
  }, [scriptReady, onError, onLoadingChange])

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div ref={containerRef} className="flex min-h-10 w-full justify-center" aria-label="Entrar com Google" />
    </>
  )
}
