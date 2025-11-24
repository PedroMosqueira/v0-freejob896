// Cliente-side helper para criar notificações via API
export async function createNotificationViaAPI(
  recipientEmail: string,
  title: string,
  message: string,
  type: string,
  needId?: string,
  proposalId?: string
) {
  try {
    console.log("[v0] 📤 Sending notification request to API")
    const response = await fetch("/api/notifications/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientEmail,
        title,
        message,
        type,
        needId,
        proposalId,
      }),
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error("[v0] ❌ API response error:", result)
      return null
    }

    console.log("[v0] ✅ Notification API response:", result)
    return result.data
  } catch (error) {
    console.error("[v0] ❌ Failed to create notification via API:", error)
    return null
  }
}
