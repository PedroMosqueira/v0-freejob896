"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, MapPin, Loader2, Camera, Image as ImageIcon } from "lucide-react"

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
  images?: FileList
}

interface ChatProps {
  onExtract: (info: ExtractedInfo) => void
  onComplete: (info: ExtractedInfo) => void
}

export function RequestFormAIChat({ onExtract, onComplete }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Olá! Vou ajudá-lo a descrever o serviço que você precisa. Me conte o que você está procurando de forma natural.",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo>({})
  const [isFirstMessage, setIsFirstMessage] = useState(true)
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [askingForPhotos, setAskingForPhotos] = useState(false)
  const [showingPreview, setShowingPreview] = useState(false)
  const [photos, setPhotos] = useState<FileList | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Detectar se é mobile
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent))
    }
    checkMobile()
  }, [])

  const fieldTranslations: Record<string, string> = {
    title: "título do serviço",
    description: "descrição detalhada",
    category: "categoria",
    city: "cidade",
    neighborhood: "bairro",
    state: "estado",
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao processar mensagem")
      }

      const data = await response.json()

      // Atualizar mensagem do assistente
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ])

      // Atualizar informações extraídas
      if (data.extracted) {
        const updated = { ...extractedInfo, ...data.extracted }
        setExtractedInfo(updated)
        onExtract(updated)
        console.log("[v0] Extracted info updated:", updated)

        // Se é primeira mensagem e extraiu title/description/category, pedir localização
        if (isFirstMessage && data.extracted.title && data.extracted.description && data.extracted.category) {
          setIsFirstMessage(false)
        }

        // Se a IA indicou que precisa de localização, mostrar botão
        if (data.needsLocation && !locationConfirmed) {
          // Localização será pedida através da UI
        }
      }
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, houve um erro. Tente novamente.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Obtendo sua localização...",
        },
      ])

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            )
            const locationData = await response.json()

            const city = locationData.address?.city || locationData.address?.town || ""
            const state = locationData.address?.state_code || locationData.address?.state || ""
            const neighborhood = locationData.address?.suburb || locationData.address?.neighbourhood || ""

            const updated = { ...extractedInfo, city, state, neighborhood }
            setExtractedInfo(updated)
            setLocationConfirmed(true)
            onExtract(updated)

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Ótimo! Sua localização foi detectada: ${neighborhood ? `${neighborhood}, ` : ""}${city} - ${state}\n\nAgora vamos adicionar algumas fotos do serviço.`,
              },
            ])

            setAskingForPhotos(true)
          } catch (error) {
            console.error("[v0] Reverse geocoding error:", error)
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "Não consegui determinar sua localização. Por favor, digite sua cidade e bairro.",
              },
            ])
          }
        },
        (error) => {
          console.error("[v0] Geolocation error:", error)
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Permissão de localização negada. Por favor, digite sua cidade e bairro.",
            },
          ])
        }
      )
    }
  }

  const handlePhotoCapture = (source: "camera" | "gallery") => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*"
      // Remover o atributo capture ou definir corretamente apenas para câmera
      if (source === "camera") {
        fileInputRef.current.capture = "environment"
      } else {
        fileInputRef.current.removeAttribute("capture")
      }
      fileInputRef.current.click()
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      // Combinar fotos antigas com novas
      const newFiles = Array.from(files)
      const existingPhotos = photos ? Array.from(photos) : []
      const allPhotos = [...existingPhotos, ...newFiles]
      
      // Criar novo FileList-like object
      const dataTransfer = new DataTransfer()
      allPhotos.forEach((file) => dataTransfer.items.add(file))
      const combinedFiles = dataTransfer.files

      setPhotos(combinedFiles)
      const totalCount = combinedFiles.length
      const newCount = files.length

      // Se é primeira vez (askingForPhotos), mostrar preview automaticamente
      const isFirstPhoto = !photos || photos.length === 0
      
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: isFirstPhoto ? `📸 Adicionei ${newCount} foto(s)` : `📸 Adicionei mais ${newCount} foto(s) (total: ${totalCount})`,
        },
        {
          role: "assistant",
          content: isFirstPhoto 
            ? `✅ Ótimo! Agora vou mostrar uma pré-visualização da sua solicitação para você revisar.`
            : `✅ Perfeito! Agora você tem ${totalCount} foto(s) anexada(s).`,
        },
      ])

      const finalInfo = { ...extractedInfo, images: combinedFiles }
      setExtractedInfo(finalInfo)
      onExtract(finalInfo)
      
      // Se era primeira foto e estava pedindo fotos, ir para preview
      if (isFirstPhoto && askingForPhotos) {
        setAskingForPhotos(false)
        setShowingPreview(true)
      }
    }
  }

  const handleEditInForm = () => {
    const finalInfo = { ...extractedInfo }
    if (photos) {
      finalInfo.images = photos
    }
    onComplete(finalInfo)
  }

  const handleConfirmFromPreview = () => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Sua solicitação foi confirmada e enviada com sucesso!",
      },
    ])
    setShowingPreview(false)
    
    // Incluir fotos no objeto final
    const finalInfo = { ...extractedInfo }
    if (photos) {
      finalInfo.images = photos
    }
    
    onComplete(finalInfo)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-100 text-gray-800 rounded-bl-none"
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Extracted Info Display */}
        {Object.keys(extractedInfo).length > 0 && !askingForPhotos && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
            <p className="text-xs font-semibold text-blue-900 mb-2">
              ✅ Informações Coletadas:
            </p>
            <div className="space-y-1 text-xs text-blue-800">
              {extractedInfo.title && <p>📌 Serviço: {extractedInfo.title}</p>}
              {extractedInfo.category && (
                <p>🏷️ Categoria: {extractedInfo.category}</p>
              )}
              {extractedInfo.description && (
                <p>📝 Descrição: {extractedInfo.description}</p>
              )}
              {(extractedInfo.city || extractedInfo.neighborhood) && (
                <p>
                  📍 Local: {extractedInfo.neighborhood ? `${extractedInfo.neighborhood}, ` : ""}{extractedInfo.city}
                  {extractedInfo.state ? ` - ${extractedInfo.state}` : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Location Button - Only show if title/description/category extracted but location not yet confirmed */}
        {!locationConfirmed && !isFirstMessage && extractedInfo.title && extractedInfo.description && extractedInfo.category && !askingForPhotos && !showingPreview && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900 mb-3">
              Agora preciso de sua localização:
            </p>
            <Button
              onClick={handleUseLocation}
              className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Usar Minha Localização
            </Button>
          </div>
        )}

        {/* Photo Upload Section */}
        {askingForPhotos && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
            <p className="text-sm text-amber-900 font-semibold">
              📸 Adicionar Fotos (obrigatório - mínimo 1)
            </p>
            <div className="flex gap-2">
              {isMobile && (
                <Button
                  onClick={() => handlePhotoCapture("camera")}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 flex-1"
                >
                  <Camera className="w-4 h-4" />
                  Tirar Foto
                </Button>
              )}
              <Button
                onClick={() => handlePhotoCapture("gallery")}
                variant="outline"
                size="sm"
                className={`flex items-center gap-2 ${isMobile ? "flex-1" : "w-full"}`}
              >
                <ImageIcon className="w-4 h-4" />
                Galeria
              </Button>
            </div>
            {!photos && (
              <p className="text-xs text-amber-700">Você deve adicionar pelo menos uma foto para continuar.</p>
            )}
          </div>
        )}

        {/* Preview Section */}
        {showingPreview && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-green-900 text-sm">
              📋 Pré-visualização da Solicitação
            </h3>

            <div className="space-y-3 text-sm">
              {extractedInfo.title && (
                <div className="border-b border-green-200 pb-2">
                  <p className="text-xs font-semibold text-green-700">Serviço</p>
                  <p className="text-green-900">{extractedInfo.title}</p>
                </div>
              )}

              {extractedInfo.category && (
                <div className="border-b border-green-200 pb-2">
                  <p className="text-xs font-semibold text-green-700">Categoria</p>
                  <p className="text-green-900">{extractedInfo.category}</p>
                </div>
              )}

              {extractedInfo.description && (
                <div className="border-b border-green-200 pb-2">
                  <p className="text-xs font-semibold text-green-700">Descrição</p>
                  <p className="text-green-900 whitespace-pre-line">{extractedInfo.description}</p>
                </div>
              )}

              {(extractedInfo.city || extractedInfo.neighborhood) && (
                <div className="border-b border-green-200 pb-2">
                  <p className="text-xs font-semibold text-green-700">Localização</p>
                  <p className="text-green-900">
                    {extractedInfo.neighborhood && `${extractedInfo.neighborhood}, `}
                    {extractedInfo.city}
                    {extractedInfo.state && ` - ${extractedInfo.state}`}
                  </p>
                </div>
              )}

              {photos && (
                <div className="border-b border-green-200 pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-semibold text-green-700">Fotos</p>
                      <p className="text-green-900">{photos.length} foto(s) anexada(s)</p>
                    </div>
                    <Button
                      onClick={() => handlePhotoCapture("gallery")}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      + Adicionar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded p-3 space-y-2">
              <p className="text-xs text-gray-600 mb-3">
                Tudo correto? Você pode:
              </p>
              <Button
                onClick={handleConfirmFromPreview}
                className="w-full bg-green-600 hover:bg-green-700 text-sm"
              >
                ✅ Confirmar e Enviar
              </Button>
              <Button
                onClick={handleEditInForm}
                variant="outline"
                className="w-full text-sm"
              >
                ✏️ Editar no Formulário
              </Button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        {/* Show input only when not in location/photos/preview stages */}
        {isFirstMessage && !locationConfirmed && !askingForPhotos && !showingPreview && (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Descreva o serviço que precisa..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              size="icon"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          onChange={handlePhotoSelect}
          accept="image/*"
          className="hidden"
          multiple
        />
      </div>
    </div>
  )
}
