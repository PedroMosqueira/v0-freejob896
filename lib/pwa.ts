"use client"

export const OPEN_INSTALL_EVENT = "freejob:open-install"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
  interface Window {
    __freejobInstallPrompt?: InstallPromptEvent | null
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

export function hasInstallPrompt(): boolean {
  return typeof window !== "undefined" && Boolean(window.__freejobInstallPrompt)
}

export async function promptInstall(): Promise<boolean> {
  const prompt = window.__freejobInstallPrompt
  if (!prompt) return false
  await prompt.prompt()
  const { outcome } = await prompt.userChoice
  window.__freejobInstallPrompt = null
  return outcome === "accepted"
}

export function openInstallDialog() {
  window.dispatchEvent(new Event(OPEN_INSTALL_EVENT))
}
