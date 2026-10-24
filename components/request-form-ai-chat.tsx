"use client"

import { useState, useRef, useEffect } from "react"
import { compressImages } from "@/lib/image-compress"
import { useHasCamera } from "@/lib/use-has-camera"
import { InAppCamera, isInAppCameraSupported } from "@/components/in-app-camera"
import { describeGeolocationError, detectLocation } from "@/lib/geolocation"
import {
  RequestDraftPreview,
  LocationPicker,
  formatLocationLabel,
  getMissingFields,
  type DraftInfo,
} from "@/components/request-draft-preview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Camera, Check, ClipboardList, Image as ImageIcon, Loader2, Send } from "lucide-react"

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

type Step = "describe" | "clarify" | "location" | "photos" | "review"

const STEP_PROMPTS: Record<Exclude<Step, "describe" | "clarify">, string> = {
  location: "Onde o serviço vai ser feito?",
  photos: "Agora adicione pelo menos uma foto do que precisa ser feito. Isso ajuda o profissional a entender e orçar.",
  review: "Tudo pronto! Confira o pedido e confirme quando quiser. Se precisar mudar algo, é só escrever aqui ou editar direto na prévia.",
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
    { role: "assistant", content: "Olá! Me conte, do seu jeito, qual serviço você precisa." },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>("describe")
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo>({})
  const [photos, setPhotos] = useState<File[]>([])
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false)
  const [showMobilePreview, setShowMobilePreview] = useState(false)

  const isMobile = useHasCamera()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const capturedBatchRef = useRef<File[]>([])

  // Refs hold the latest values so async handlers (AI, geolocation, compression) never act on stale state.
  const infoRef = useRef<ExtractedInfo>({})
  const photosRef = useRef<File[]>([])
  const stepRef = useRef<Step>("describe")
  // Fields the user corrected by hand in the preview win over later AI rewrites.
  const manualFieldsRef = useRef(new Set<keyof ExtractedInfo>())

  const hasDraft = Boolean(extractedInfo.title && extractedInfo.description)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [messages, step, loading, completed])

  const updateInfo = (patch: Partial<ExtractedInfo>) => {
    const updated = { ...infoRef.current, ...patch }
    infoRef.current = updated
    setExtractedInfo(updated)
    onExtract(updated)
  }

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

  const addMessage = (role: Message["role"], content: string) => {
    setMessages((prev) => [...prev, { role, content }])
  }

  const goToStep = (next: Step) => {
    stepRef.current = next
    setStep(next)
    if (next !== "describe" && next !== "clarify") addMessage("assistant", STEP_PROMPTS[next])
  }

  // Skips any step whose data was already filled (e.g. edited directly in the preview).
  const advancePastDetails = () => {
    if (!infoRef.current.city) goToStep("location")
    else if (photosRef.current.length === 0) goToStep("photos")
    else goToStep("review")
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")
    addMessage("user", userMessage)
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
      addMessage("assistant", data.message)
      if (data.extracted) applyAIExtraction(data.extracted)

      const current = stepRef.current
      if (current === "describe" || current === "clarify") {
        if (data.hasQuestion) {
          stepRef.current = "clarify"
          setStep("clarify")
        } else {
          advancePastDetails()
        }
      }
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      addMessage("assistant", "Desculpe, houve um erro. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleSkipDetails = () => {
    addMessage("user", "Prefiro seguir sem mais detalhes.")
    advancePastDetails()
  }

  const onLocationSet = () => {
    if (stepRef.current !== "location") return
    addMessage("user", `Local: ${formatLocationLabel(infoRef.current)}`)
    if (photosRef.current.length === 0) goToStep("photos")
    else goToStep("review")
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
      onLocationSet()
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
    onLocationSet()
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

  const handlePhotosDone = () => {
    const count = photosRef.current.length
    addMessage("user", count === 1 ? "Adicionei 1 foto." : `Adicionei ${count} fotos.`)
    goToStep("review")
  }

  const buildFinalInfo = (): ExtractedInfo => ({
    ...infoRef.current,
    images: photosRef.current.length > 0 ? photosRef.current : undefined,
  })

  const missing = getMissingFields(extractedInfo, photos.length)
  const canConfirm = missing.length === 0 && !isProcessingPhotos

  const handleConfirm = () => {
    if (!canConfirm) return
    setShowMobilePreview(false)
    addMessage("assistant", confirmMessage)
    setCompleted(true)
    onComplete(buildFinalInfo())
  }

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex min-w-0 flex-1 flex-col">
        {hasDraft && !completed && (
          <button
            type="button"
            onClick={() => setShowMobilePreview(true)}
            className="flex items-center justify-between gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2 text-left text-sm text-blue-900 md:hidden"
          >
            <span className="flex min-w-0 items-center gap-2">
              <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate font-medium">{extractedInfo.title}</span>
            </span>
            <span className="shrink-0 text-xs text-blue-700">Ver prévia</span>
          </button>
        )}

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
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

          {!loading && !completed && step === "clarify" && (
            <div className="flex justify-start">
              <Button type="button" variant="outline" size="sm" onClick={handleSkipDetails} className="gap-1.5 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800">
                Prosseguir sem detalhes
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          )}

          {!completed && step === "location" && (
            <StepCard>
              <LocationPicker
                idPrefix="chat-location"
                initial={extractedInfo}
                isLocating={isLocating}
                error={locationError}
                onUseLocation={handleUseLocation}
                onManual={handleManualLocation}
              />
            </StepCard>
          )}

          {!completed && step === "photos" && (
            <StepCard>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  {isMobile && (
                    <Button type="button" variant="outline" size="sm" onClick={() => handlePhotoCapture("camera")} className="flex-1 gap-1.5 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800">
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      Tirar foto
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => handlePhotoCapture("gallery")} className="flex-1 gap-1.5 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800">
                    <ImageIcon className="h-4 w-4" aria-hidden="true" />
                    {isMobile ? "Galeria" : "Escolher fotos"}
                  </Button>
                </div>
                {(photos.length > 0 || isProcessingPhotos) && (
                  <p className="text-xs text-gray-600" aria-live="polite">
                    {isProcessingPhotos
                      ? "Processando..."
                      : photos.length === 1
                        ? "1 foto adicionada ao pedido."
                        : `${photos.length} fotos adicionadas ao pedido.`}
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePhotosDone}
                  disabled={photos.length === 0 || isProcessingPhotos}
                  className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                >
                  Continuar
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </StepCard>
          )}

          {!completed && step === "review" && (
            <StepCard>
              <div className="flex flex-col gap-2">
                {missing.length > 0 && <p className="text-xs text-gray-600">Falta: {missing.join(", ")}.</p>}
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className="w-full gap-1.5 bg-green-600 text-white hover:bg-green-700"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Confirmar e enviar
                </Button>
                <button
                  type="button"
                  onClick={() => setShowMobilePreview(true)}
                  className="text-xs text-blue-700 underline-offset-2 hover:underline md:hidden"
                >
                  Ver prévia do pedido
                </button>
              </div>
            </StepCard>
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
                placeholder={
                  step === "clarify"
                    ? "Responda ou clique em prosseguir..."
                    : hasDraft
                      ? "Acrescente ou corrija algo..."
                      : "Descreva o serviço que precisa..."
                }
                aria-label={hasDraft ? "Complementar pedido" : "Descrever serviço"}
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={loading || !input.trim()} size="icon" aria-label="Enviar mensagem">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </div>

      {!completed && (
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
          onClose={() => setShowMobilePreview(false)}
          className={`${
            showMobilePreview ? "absolute inset-0 z-10 flex" : "hidden"
          } md:static md:z-auto md:flex md:w-80 md:shrink-0 md:border-l md:border-gray-200 lg:w-96`}
        />
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
  )
}

function StepCard({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-sm self-start rounded-lg border border-blue-200 bg-blue-50/60 p-3">{children}</div>
}
