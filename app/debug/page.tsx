"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugPage() {
  const [info, setInfo] = useState<any>(null)

  useEffect(() => {
    // Verificar URL atual
    const url = new URL(window.location.href)
    const hash = url.hash
    const searchParams = Object.fromEntries(url.searchParams)

    // Checar se há token no hash
    const hasAccessToken = hash.includes("access_token")
    const hasCode = url.searchParams.has("code")

    setInfo({
      currentUrl: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      hash: hash ? hash.substring(0, 50) + "..." : "vazio",
      hasAccessToken,
      hasCode,
      searchParams,
    })

    console.log("[v0] Debug Info:", {
      currentUrl: window.location.href,
      origin: window.location.origin,
      hasAccessToken,
      hasCode,
    })
  }, [])

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Debug OAuth</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(info, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
