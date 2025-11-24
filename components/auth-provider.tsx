"use client"

import { SessionProvider } from "next-auth/react"
import type React from "react"
import type { Session } from "next-auth"
import { useEffect } from "react"

export function AuthProvider({ children, session }: { children: React.ReactNode; session: Session | null }) {
  useEffect(() => {
    console.log("[v0] 🟢 AuthProvider - Session:", session ? `User: ${session.user?.email}` : "No session")
  }, [session])

  return <SessionProvider session={session}>{children}</SessionProvider>
}
