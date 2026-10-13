// Shared SWR key so any component can refresh the header counter with mutate().
export const ACTIVE_INTERESTS_KEY = "/api/interests/active"

export async function fetchActiveInterests(url: string): Promise<{ count: number }> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Failed to load active interests (${response.status})`)
  }
  const data = await response.json()
  return { count: Number(data.count) || 0 }
}
