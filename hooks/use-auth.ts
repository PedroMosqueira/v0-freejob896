"use client"

import { useSession, signIn as authSignIn, signOut as authSignOut } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"

export function useAuth() {
  const sessionResult = useSession() || { data: null, status: "loading" }
  const { data: session, status } = sessionResult
  const [isFreeUser, setIsFreeUser] = useState(true)

  useEffect(() => {
    async function fetchSubscription() {
      if (session?.user?.email) {
        try {
          const response = await fetch("/api/user/subscription")
          if (!response.ok) {
            console.error("Subscription API returned error:", response.status)
            setIsFreeUser(true)
            return
          }

          const data = await response.json()
          setIsFreeUser(data.plan !== "premium" || !data.is_active)
        } catch (error) {
          console.error("Error fetching subscription:", error)
          setIsFreeUser(true)
        }
      } else {
        setIsFreeUser(true)
      }
    }

    if (status !== "loading") {
      fetchSubscription()
    }
  }, [session?.user?.email, status])

  const isLoading = status === "loading"
  const email = session?.user?.email || null

  const login = useCallback(async (userEmail: string, password?: string) => {
    const result = await authSignIn("credentials", {
      email: userEmail,
      password: password || "password123",
      redirect: false,
    })

    if (result?.error) {
      console.error("Login failed:", result.error)
      return false
    }
    return true
  }, [])

  const logout = useCallback(async () => {
    await authSignOut({ callbackUrl: "/" })
  }, [])

  return { email, login, logout, isLoading, isFreeUser }
}
