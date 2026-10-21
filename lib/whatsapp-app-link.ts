export type WhatsAppApp = "personal" | "business"

const ANDROID_PACKAGES: Record<WhatsAppApp, string> = {
  personal: "com.whatsapp",
  business: "com.whatsapp.w4b",
}

export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)
}

export function isMobileDevice(): boolean {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

// wa.me opens whichever app the phone has set as default (often WhatsApp Business).
// On Android an intent URL can target a specific app, falling back to wa.me if it isn't installed.
// iOS has no equivalent: the system decides which app handles wa.me.
export function buildAndroidAppLink(waMeLink: string, app: WhatsAppApp): string {
  const url = new URL(waMeLink)
  const phone = url.pathname.replace(/\D/g, "")
  const text = url.searchParams.get("text") ?? ""
  const query = `phone=${phone}&text=${encodeURIComponent(text)}`
  return `intent://send?${query}#Intent;scheme=whatsapp;package=${ANDROID_PACKAGES[app]};S.browser_fallback_url=${encodeURIComponent(waMeLink)};end`
}
