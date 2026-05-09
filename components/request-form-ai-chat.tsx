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
        "Olá! 👋 Vou ajudá-lo a descrever o serviço que você precisa. Me conte o que você está procurando de forma natural, e eu vou extrair as informações para preencher o formulário.",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo>({})
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [needsLocation, setNeedsLocation] = useState(false)
  const [askingForPhotos, setAskingForPhotos] = useState(false)
  const [photos, setPhotos] = useState<FileList | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      }

      // Processar campos faltantes com mensagem amigável
      if (data.missingFields && data.missingFields.length > 0) {
        setMissingFields(data.missingFields)
        
        // Se ainda faltam campos, adicionar mensagem de feedback
        if (data.missingFields.length > 0 && !data.isComplete) {
          const missingFieldsText = data.missingFields
            .map((field: string) => fieldTranslations[field] || field)
            .join(", ")
          
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `📋 Para completar sua solicitação, ainda preciso de:\n• ${missingFieldsText.split(", ").join("\n• ")}`,
            },
          ])
        }
      }

      if (data.needsLocation) {
        setNeedsLocation(true)
      }

      if (data.isComplete && data.missingFields.length === 0) {
        setIsComplete(true)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "✅ Perfeito! Todas as informações foram coletadas. Agora vou solicitar algumas fotos do serviço para melhorar sua solicitação.",
          },
        ])
        setAskingForPhotos(true)
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
          content: "📍 Buscando sua localização...",
        },
      ])

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords

          // Fazer reverse geocoding (simplificado)
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            )
            const locationData = await response.json()

            const city = locationData.address?.city || locationData.address?.town || "Localização detectada"
            const state = locationData.address?.state_code || ""
            const neighborhood = locationData.address?.suburb || locationData.address?.neighbourhood || ""

            const updated = { ...extractedInfo, city, state, neighborhood, latitude, longitude }
            setExtractedInfo(updated)
            onExtract(updated)

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `✅ Localização registrada!\n📍 ${neighborhood || city}, ${state}`,
              },
            ])

            setNeedsLocation(false)
          } catch (error) {
            console.error("[v0] Reverse geocoding error:", error)
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "❌ Não consegui determinar sua localização. Por favor, digite sua cidade e bairro.",
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
              content: "❌ Permissão de localização negada. Por favor, digite sua cidade e bairro.",
            },
          ])
        }
      )
    }
  }

  const handlePhotoCapture = (source: "camera" | "gallery") => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*"
      fileInputRef.current.capture = source === "camera" ? "environment" : undefined
      fileInputRef.current.click()
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      setPhotos(files)
      const photoNames = Array.from(files)
        .map((f) => f.name)
        .join(", ")

      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: `📸 Adicionei ${files.length} foto(s)`,
        },
        {
          role: "assistant",
          content: `✅ Ótimo! Recebi ${files.length} foto(s). Todas as informações estão prontas!`,
        },
      ])

      const finalInfo = { ...extractedInfo, images: files }
      setExtractedInfo(finalInfo)
      onExtract(finalInfo)
      setAskingForPhotos(false)
    }
  }

  const handleConfirmSubmit = () => {
    onComplete(extractedInfo)
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

        {/* Location Button */}
        {needsLocation && (
          <div className="flex gap-2">
            <Button
              onClick={handleUseLocation}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
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
              📸 Adicionar Fotos (opcional)
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => handlePhotoCapture("camera")}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 flex-1"
              >
                <Camera className="w-4 h-4" />
                Tirar Foto
              </Button>
              <Button
                onClick={() => handlePhotoCapture("gallery")}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 flex-1"
              >
                <ImageIcon className="w-4 h-4" />
                Galeria
              </Button>
            </div>
            <Button
              onClick={() => {
                setAskingForPhotos(false)
                setIsComplete(true)
              }}
              variant="ghost"
              size="sm"
              className="w-full text-xs"
            >
              Prosseguir sem fotos
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        {!askingForPhotos && !isComplete && (
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

        {isComplete && !askingForPhotos && (
          <Button onClick={handleConfirmSubmit} className="w-full bg-green-600 hover:bg-green-700">
            ✅ Confirmar e Enviar Solicitação
          </Button>
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
