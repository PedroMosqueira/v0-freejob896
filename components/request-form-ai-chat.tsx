"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, MapPin, Loader2 } from "lucide-react"

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
        "Olá! Vou ajudá-lo a descrever o serviço que você precisa. Me conte o que você está procurando. 😊",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo>({})
  const [missingFields, setMissingFields] = useState<string[]>([
    "title",
    "description",
    "category",
  ])
  const [isComplete, setIsComplete] = useState(false)
  const [needsLocation, setNeedsLocation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

      // Atualizar status de campos faltantes
      if (data.missingFields) {
        setMissingFields(data.missingFields)
      }

      if (data.needsLocation) {
        setNeedsLocation(true)
      }

      if (data.isComplete) {
        setIsComplete(true)
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
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords
        console.log("[v0] Location received:", latitude, longitude)

        // Simulação: aqui você poderia fazer reverse geocoding
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Ótimo! Sua localização foi registrada.",
          },
        ])
        setNeedsLocation(false)
      })
    }
  }

  const handleConfirmSubmit = () => {
    if (isComplete) {
      onComplete(extractedInfo)
    }
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
              className={`max-w-xs px-4 py-2 rounded-lg ${
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
        {Object.keys(extractedInfo).length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-2">
            <p className="text-xs font-semibold text-blue-900 mb-2">
              Informações Extraídas:
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
                  📍 Local: {extractedInfo.neighborhood || extractedInfo.city}
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

        {/* Missing Fields Info */}
        {missingFields.length > 0 && !isComplete && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
            <p className="text-xs text-amber-800">
              Faltam: {missingFields.join(", ")}
            </p>
          </div>
        )}

        {/* Complete Message */}
        {isComplete && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800 font-semibold">
              ✅ Tudo pronto! Você pode confirmar a solicitação.
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Descreva o serviço que precisa..."
            disabled={loading || isComplete}
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

        {isComplete && (
          <Button onClick={handleConfirmSubmit} className="w-full">
            Confirmar Solicitação
          </Button>
        )}
      </div>
    </div>
  )
}
