"use client"

const REQUEST_KEY = "freejob:pending-request"
const INTEREST_KEY = "freejob:pending-interest"
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const MAX_IMAGES = 4

export interface PendingRequestDraft {
  title?: string
  description?: string
  category?: string
  city?: string
  state?: string
  neighborhood?: string
  latitude?: number
  longitude?: number
  images: string[]
  savedAt: number
}

export interface PendingRequestInput {
  title?: string
  description?: string
  category?: string
  city?: string
  state?: string
  neighborhood?: string
  latitude?: number
  longitude?: number
  images?: File[]
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function savePendingRequest(info: PendingRequestInput): Promise<{ imagesDropped: boolean }> {
  const files = (info.images ?? []).slice(0, MAX_IMAGES)
  const images = await Promise.all(files.map(fileToDataUrl)).catch(() => [] as string[])

  const draft: PendingRequestDraft = {
    title: info.title,
    description: info.description,
    category: info.category,
    city: info.city,
    state: info.state,
    neighborhood: info.neighborhood,
    latitude: info.latitude,
    longitude: info.longitude,
    images,
    savedAt: Date.now(),
  }

  try {
    localStorage.setItem(REQUEST_KEY, JSON.stringify(draft))
    return { imagesDropped: false }
  } catch {
    // Photos can exceed the browser storage quota; keep the text so the request is not lost.
    localStorage.setItem(REQUEST_KEY, JSON.stringify({ ...draft, images: [] }))
    return { imagesDropped: images.length > 0 }
  }
}

export function loadPendingRequest(): PendingRequestDraft | null {
  try {
    const raw = localStorage.getItem(REQUEST_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as PendingRequestDraft
    if (!draft?.savedAt || Date.now() - draft.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(REQUEST_KEY)
      return null
    }
    return { ...draft, images: Array.isArray(draft.images) ? draft.images : [] }
  } catch {
    return null
  }
}

export function hasPendingRequest(): boolean {
  return loadPendingRequest() !== null
}

export function clearPendingRequest() {
  try {
    localStorage.removeItem(REQUEST_KEY)
  } catch {}
}

export function savePendingInterest(needId: string) {
  try {
    localStorage.setItem(INTEREST_KEY, JSON.stringify({ needId, savedAt: Date.now() }))
  } catch {}
}

export function takePendingInterest(): string | null {
  try {
    const raw = localStorage.getItem(INTEREST_KEY)
    if (!raw) return null
    localStorage.removeItem(INTEREST_KEY)
    const { needId, savedAt } = JSON.parse(raw) as { needId?: string; savedAt?: number }
    if (!needId || !savedAt || Date.now() - savedAt > MAX_AGE_MS) return null
    return needId
  } catch {
    return null
  }
}
