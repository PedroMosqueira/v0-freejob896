// Shared SWR key so any component can refresh the header counter with mutate().
export const ACTIVE_INTERESTS_KEY = "/api/interests/active"

export interface ActiveInterestsData {
  count: number
  heldCount: number
  nextReleaseAt: string | null
}

export async function fetchActiveInterests(url: string): Promise<ActiveInterestsData> {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Failed to load active interests (${response.status})`)
  }
  const data = await response.json()
  return {
    count: Number(data.count) || 0,
    heldCount: Number(data.heldCount) || 0,
    nextReleaseAt: typeof data.nextReleaseAt === "string" ? data.nextReleaseAt : null,
  }
}
