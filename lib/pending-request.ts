"use client"

const REQUEST_KEY = "freejob:pending-request"
const REF_KEY = "freejob:pending-request-ref"
const INTEREST_KEY = "freejob:pending-interest"
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const REF_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000
const MAX_IMAGES = 4
const MAX_IMAGE_SIDE = 1280

export interface PendingRequestDraft {
  title?: string
  description?: string
  category?: string
  city?: string
  state?: string
  neighborhood?: string
  latitude?: number
  longitude?: number
  isRemote?: boolean
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
  isRemote?: boolean
  images?: File[]
}

export interface PendingRequestRef {
  id: string
  token: string
}

export type ClaimResult =
  | { status: "published"; needId: string; title?: string }
  | { status: "incomplete" | "failed"; draft: Omit<PendingRequestDraft, "savedAt"> }
  | { status: "not_found" }

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function compressImage(file: File): Promise<string> {
  const original = await fileToDataUrl(file)
  try {
    const image = new Image()
    image.crossOrigin = "anonymous"
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error("Imagem inválida"))
      image.src = original
    })
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(image.width * scale)
    canvas.height = Math.round(image.height * scale)
    const context = canvas.getContext("2d")
    if (!context) return original
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.8)
  } catch {
    return original
  }
}

async function geocode(city?: string, state?: string, neighborhood?: string) {
  if (!city || !state) return null
  const queries = [neighborhood ? `${neighborhood}, ${city}, ${state}, Brasil` : null, `${city}, ${state}, Brasil`]
  for (const query of queries) {
    if (!query) continue
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        return { lat: Number.parseFloat(data[0].lat), lon: Number.parseFloat(data[0].lon) }
      }
    } catch {}
  }
  return null
}

function storeLocalDraft(draft: PendingRequestDraft): boolean {
  try {
    localStorage.setItem(REQUEST_KEY, JSON.stringify(draft))
    return true
  } catch {
    // Photos can exceed the browser storage quota; keep the text so the request is not lost.
    try {
      localStorage.setItem(REQUEST_KEY, JSON.stringify({ ...draft, images: [] }))
    } catch {}
    return false
  }
}

export function restoreDraftLocally(draft: Omit<PendingRequestDraft, "savedAt">) {
  storeLocalDraft({ ...draft, images: Array.isArray(draft.images) ? draft.images : [], savedAt: Date.now() })
}

export async function savePendingRequest(
  info: PendingRequestInput,
): Promise<{ imagesDropped: boolean; ref: PendingRequestRef | null }> {
  const files = (info.images ?? []).slice(0, MAX_IMAGES)
  const images = await Promise.all(files.map(compressImage)).catch(() => [] as string[])

  let { latitude, longitude } = info
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    const coords = await geocode(info.city, info.state, info.neighborhood)
    if (coords) {
      latitude = coords.lat
      longitude = coords.lon
    }
  }

  const draft: PendingRequestDraft = {
    title: info.title,
    description: info.description,
    category: info.category,
    city: info.city,
    state: info.state,
    neighborhood: info.neighborhood,
    latitude,
    longitude,
    isRemote: info.isRemote === true,
    images,
    savedAt: Date.now(),
  }

  try {
    const response = await fetch("/api/public/pending-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, savedAt: undefined }),
    })
    if (response.ok) {
      const ref = (await response.json()) as PendingRequestRef
      localStorage.setItem(REF_KEY, JSON.stringify({ ...ref, savedAt: Date.now() }))
      localStorage.removeItem(REQUEST_KEY)
      return { imagesDropped: false, ref }
    }
  } catch {}

  const keptImages = storeLocalDraft(draft)
  return { imagesDropped: !keptImages && images.length > 0, ref: null }
}

export function getPendingRef(): PendingRequestRef | null {
  try {
    const raw = localStorage.getItem(REF_KEY)
    if (!raw) return null
    const ref = JSON.parse(raw) as PendingRequestRef & { savedAt?: number }
    if (!ref?.id || !ref?.token || !ref.savedAt || Date.now() - ref.savedAt > REF_MAX_AGE_MS) {
      localStorage.removeItem(REF_KEY)
      return null
    }
    return { id: ref.id, token: ref.token }
  } catch {
    return null
  }
}

export function clearPendingRef() {
  try {
    localStorage.removeItem(REF_KEY)
  } catch {}
}

export function encodePendingRef(ref: PendingRequestRef) {
  return `${ref.id}.${ref.token}`
}

export function decodePendingRef(value: string | null | undefined): PendingRequestRef | null {
  if (!value) return null
  const separator = value.indexOf(".")
  if (separator <= 0) return null
  return { id: value.slice(0, separator), token: value.slice(separator + 1) }
}

export async function claimPendingRequest(ref: PendingRequestRef): Promise<ClaimResult> {
  try {
    const response = await fetch("/api/pending-requests/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ref),
    })
    if (response.status === 404) return { status: "not_found" }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as ClaimResult
  } catch {
    // Network errors keep the reference so the next visit can retry.
    throw new Error("claim_failed")
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
