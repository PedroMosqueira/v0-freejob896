interface CachedChat {
  threads: any[]
  profiles: Record<string, string>
  needs: Record<string, any>
  timestamp: number
}

interface CachedMessages {
  messages: any[]
  timestamp: number
}

const CACHE_KEY_PREFIX = "freejob_chat_"
const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes

export function getCachedChats(userEmail: string): CachedChat | null {
  if (typeof window === "undefined") return null

  try {
    const key = `${CACHE_KEY_PREFIX}threads_${userEmail}`
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const data: CachedChat = JSON.parse(cached)

    // Check if cache is expired
    if (Date.now() - data.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key)
      return null
    }

    return data
  } catch (error) {
    console.error("[Cache] Error reading cached chats:", error)
    return null
  }
}

export function setCachedChats(userEmail: string, data: Omit<CachedChat, "timestamp">): void {
  if (typeof window === "undefined") return

  try {
    const key = `${CACHE_KEY_PREFIX}threads_${userEmail}`
    const cachedData: CachedChat = {
      ...data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cachedData))
  } catch (error) {
    console.error("[Cache] Error saving cached chats:", error)
  }
}

export function getCachedMessages(chatThreadId: string): CachedMessages | null {
  if (typeof window === "undefined") return null

  try {
    const key = `${CACHE_KEY_PREFIX}messages_${chatThreadId}`
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const data: CachedMessages = JSON.parse(cached)

    // Messages cache expires faster (1 minute)
    if (Date.now() - data.timestamp > 60 * 1000) {
      localStorage.removeItem(key)
      return null
    }

    return data
  } catch (error) {
    console.error("[Cache] Error reading cached messages:", error)
    return null
  }
}

export function setCachedMessages(chatThreadId: string, messages: any[]): void {
  if (typeof window === "undefined") return

  try {
    const key = `${CACHE_KEY_PREFIX}messages_${chatThreadId}`
    const cachedData: CachedMessages = {
      messages,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cachedData))
  } catch (error) {
    console.error("[Cache] Error saving cached messages:", error)
  }
}

export function clearChatCache(userEmail?: string): void {
  if (typeof window === "undefined") return

  try {
    if (userEmail) {
      // Clear specific user cache
      const key = `${CACHE_KEY_PREFIX}threads_${userEmail}`
      localStorage.removeItem(key)
    } else {
      // Clear all chat cache
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    }
  } catch (error) {
    console.error("[Cache] Error clearing cache:", error)
  }
}
