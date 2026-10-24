"use client"

import { useState, useRef, useEffect } from "react"
import { compressImages } from "@/lib/image-compress"
import { useHasCamera } from "@/lib/use-has-camera"
import { InAppCamera, isInAppCameraSupported } from "@/components/in-app-camera"
import { describeGeolocationError, detectLocation } from "@/lib/geolocation"
import { RequestDraftPreview, type DraftInfo } from "@/components/request-draft-preview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2 } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ExtractedInfo {
  title?: string
  description?: string
  category?: string
  city?: string
  state?: string
  neighborhood?: string
  latitude?: number
  longitude?: number
  locationApproximate?: boolean
  isRemote?: boolean
  images?: File[]
}

interface ChatProps {
  onExtract: (info: ExtractedInfo) => void
  onComplete: (info: ExtractedInfo) => void
  confirmMessage?: string
  afterComplete?: React.ReactNode
  hideEditInForm?: boolean
}

const OFFICIAL_CATEGORIES = [
  "Encanador", "Eletricista", "Pedreiro", "Pintor", "Montador de Móveis",
  "Marceneiro", "Serralheiro", "Limpeza", "Jardinagem", "Diarista",
  "Dedetização", "Ar Condicionado", "Vidraceiro", "Chaveiro", "Mudanças",
  "Técnico de Informática", "Cabeleireiro", "Manicure", "Costureira",
  "Professor Particular", "Outros",
]

export function RequestFormAIChat({
  onExtract,
  onComplete,
  confirmMessage = "Sua solicitação foi confirmada e enviada com sucesso!",
  afterComplete,
  hideEditInForm = false,
}: ChatProps) {
  const [completed, setCompleted] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Me conte, do seu jeito, qual serviço você precisa.",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo>({})
  const [photos, setPhotos] = useState<File[]>([])
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false)

  const isMobile = useHasCamera()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const capturedBatchRef = useRef<File[]>([])

  const hasDraft = Boolean(extractedInfo.title && extractedInfo.description)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const area = scrollAreaRef.current
    const preview = previewRef.current
    // With a draft on screen, keep its top in view instead of jumping to the confirm button at the bottom.
    if (area && preview && !completed) {
      area.scrollTo({ top: Math.max(0, preview.offsetTop - area.clientHeight / 3), behavior: "smooth" })
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [messages, hasDraft, completed])

  // Refs hold the latest values so async handlers (geolocation, compression) never merge into stale state.
  const infoRef = useRef<ExtractedInfo>({})
  const photosRef = useRef<File[]>([])

  const updateInfo = (patch: Partial<ExtractedInfo>) => {
    const updated = { ...infoRef.current, ...patch }
    infoRef.current = updated
    setExtractedInfo(updated)
    onExtract(updated)
  }

  // Fields the user corrected by hand in the preview win over later AI rewrites.
  const manualFieldsRef = useRef(new Set<keyof ExtractedInfo>())

  const handleManualEdit = (patch: Partial<ExtractedInfo>) => {
    for (const key of Object.keys(patch) as (keyof ExtractedInfo)[]) manualFieldsRef.current.add(key)
    updateInfo(patch)
  }

  const applyAIExtraction = (extracted: Partial<ExtractedInfo>) => {
    const patch = Object.fromEntries(
      Object.entries(extracted).filter(([key]) => !manualFieldsRef.current.has(key as keyof ExtractedInfo)),
    ) as Partial<ExtractedInfo>
    updateInfo(patch)
  }

  const updatePhotos = (next: File[]) => {
    photosRef.current = next
    setPhotos(next)
    updateInfo({ images: next })
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch("/api/ai/extract-service-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          currentDraft: infoRef.current.title
            ? {
                title: infoRef.current.title,
                description: infoRef.current.description,
                category: infoRef.current.category,
                isRemote: infoRef.current.isRemote,
              }
            : undefined,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.error || `Erro ao processar mensagem (${response.status})`)
      }

      const data = await response.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }])
      if (data.extracted) applyAIExtraction(data.extracted)
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      setMessages((prev) => [...prev, { role: "assistant", content: "Desculpe, houve um erro. Tente novamente." }])
    } finally {
      setLoading(false)
    }
  }

  const handleUseLocation = async () => {
    if (isLocating) return
    setIsLocating(true)
    setLocationError(null)
    try {
      const location = await detectLocation()
      if (!location.city) {
        setLocationError("Peguei suas coordenadas, mas não o nome da cidade. Digite a cidade e o estado.")
        return
      }
      updateInfo({ ...location, locationApproximate: false })
    } catch (error) {
      setLocationError(error instanceof Error && !("code" in error) ? error.message : describeGeolocationError(error))
    } finally {
      setIsLocating(false)
    }
  }

  const handleManualLocation = async (location: { city: string; state: string; neighborhood: string }) => {
    setLocationError(null)
    const query = [location.neighborhood, location.city, location.state, "Brasil"].filter(Boolean).join(", ")
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      const results = await response.json()
      const match = Array.isArray(results) ? results[0] : null
      const latitude = match?.lat ? Number(match.lat) : undefined
      const longitude = match?.lon ? Number(match.lon) : undefined
      updateInfo({
        ...location,
        ...(latitude !== undefined && longitude !== undefined ? { latitude, longitude } : { latitude: undefined, longitude: undefined }),
        locationApproximate: true,
      })
    } catch (error) {
      console.error("[v0] Erro ao obter coordenadas aproximadas:", error)
      updateInfo({ ...location, latitude: undefined, longitude: undefined, locationApproximate: false })
    }
  }

  const handlePhotoCapture = (source: "camera" | "gallery") => {
    if (source === "camera" && isInAppCameraSupported()) {
      setIsCameraOpen(true)
      return
    }
    const target = source === "camera" ? cameraInputRef.current : fileInputRef.current
    target?.click()
  }

  const handleCameraUnavailable = () => {
    setIsCameraOpen(false)
    cameraInputRef.current?.click()
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.currentTarget
    const selected = target.files ? Array.from(target.files) : []
    target.value = ""
    addPhotoFiles(selected)
  }

  const addPhotoFiles = async (selected: File[]) => {
    if (selected.length === 0) return
    setIsProcessingPhotos(true)
    try {
      const compressed = await compressImages(selected)
      if (compressed.length > 0) updatePhotos([...photosRef.current, ...compressed])
    } finally {
      setIsProcessingPhotos(false)
    }
  }

  const handleRemovePhoto = (index: number) => {
    updatePhotos(photosRef.current.filter((_, i) => i !== index))
  }

  const buildFinalInfo = (): ExtractedInfo => ({
    ...infoRef.current,
    images: photosRef.current.length > 0 ? photosRef.current : undefined,
  })

  const handleConfirm = () => {
    setMessages((prev) => [...prev, { role: "assistant", content: confirmMessage }])
    setCompleted(true)
    onComplete(buildFinalInfo())
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white">
      <div ref={scrollAreaRef} className="relative flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-lg px-4 py-2 ${
                msg.role === "user" ? "rounded-br-none bg-blue-500 text-white" : "rounded-bl-none bg-gray-100 text-gray-800"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg rounded-bl-none bg-gray-100 px-4 py-2 text-sm text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              {hasDraft ? "Atualizando o pedido..." : "Montando seu pedido..."}
            </div>
          </div>
        )}

        {hasDraft && !completed && (
          <div ref={previewRef}>
          <RequestDraftPreview
            info={extractedInfo as DraftInfo}
            photos={photos}
            categories={OFFICIAL_CATEGORIES}
            isMobile={isMobile}
            isLocating={isLocating}
            isProcessingPhotos={isProcessingPhotos}
            locationError={locationError}
            onChange={handleManualEdit}
            onUseLocation={handleUseLocation}
            onManualLocation={handleManualLocation}
            onAddPhotos={handlePhotoCapture}
            onRemovePhoto={handleRemovePhoto}
            onConfirm={handleConfirm}
            onEditInForm={hideEditInForm ? undefined : () => onComplete(buildFinalInfo())}
          />
          </div>
        )}

        {completed && afterComplete}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-3">
        {!completed && (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return
                e.preventDefault()
                handleSendMessage()
              }}
              placeholder={hasDraft ? "Acrescente ou corrija algo..." : "Descreva o serviço que precisa..."}
              aria-label={hasDraft ? "Complementar pedido" : "Descrever serviço"}
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={loading || !input.trim()} size="icon" aria-label="Enviar mensagem">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}

        <input ref={fileInputRef} type="file" onChange={handlePhotoSelect} accept="image/*" className="hidden" multiple />
        {/* Android ignores capture on inputs with multiple and opens the file picker, so the camera gets its own single-file input. */}
        <input ref={cameraInputRef} type="file" onChange={handlePhotoSelect} accept="image/*" capture="environment" className="hidden" />
        {/* Photos taken in one camera session are added together, so the chat gets a single message. */}
        <InAppCamera
          open={isCameraOpen}
          onCapture={(file) => capturedBatchRef.current.push(file)}
          onClose={() => {
            setIsCameraOpen(false)
            const batch = capturedBatchRef.current
            capturedBatchRef.current = []
            addPhotoFiles(batch)
          }}
          onUnavailable={handleCameraUnavailable}
        />
      </div>
    </div>
  )
}
