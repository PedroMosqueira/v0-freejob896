import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      )
    }

    console.log("[v0] Extracting service info from:", message.substring(0, 50))

    // System prompt para extrair informações de forma conversacional
    const systemPrompt = `Você é um assistente IA que ajuda usuários a descrever serviços que precisam.
    
Sua tarefa é:
1. Entender o que o usuário precisa
2. Extrair informações estruturadas (title, description, category, location)
3. Fazer perguntas amigáveis para preencher campos faltantes
4. Sugerir categorias com base na descrição
5. Solicitar localização quando necessário

Categorias disponíveis: "Reparação", "Limpeza", "Aulas", "Mudança", "Entrega", "Consultoria", "Beleza", "Outro"

Responda em JSON com este formato:
{
  "message": "Sua resposta conversacional",
  "extracted": {
    "title": "Título do serviço (ou null)",
    "description": "Descrição completa (ou null)",
    "category": "Categoria detectada (ou null)",
    "city": "Cidade (ou null)",
    "state": "Estado/UF (ou null)",
    "neighborhood": "Bairro (ou null)"
  },
  "needsLocation": false,
  "missingFields": ["title", "description", "category", "location"],
  "isComplete": false
}

Importante: Sempre responda APENAS com JSON válido, sem markdown ou blocos de código.`

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages: [
        ...conversationHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user",
          content: message,
        },
      ],
      maxTokens: 500,
      temperature: 0.7,
    })

    console.log("[v0] Groq response:", text.substring(0, 100))

    // Parse JSON response
    let parsedResponse
    try {
      // Remove markdown if present
      const cleanText = text.replace(/```json\n?|\n?```/g, "").trim()
      parsedResponse = JSON.parse(cleanText)
    } catch (e) {
      console.error("[v0] Failed to parse Groq response:", e)
      return NextResponse.json(
        {
          message: "Desculpe, houve um erro ao processar sua mensagem. Tente novamente.",
          extracted: {},
          missingFields: [],
          isComplete: false,
        },
        { status: 200 },
      )
    }

    // Validar estrutura da resposta
    if (!parsedResponse.message || !parsedResponse.extracted) {
      return NextResponse.json(
        {
          message: "Entendi. Me conte mais detalhes sobre o serviço que você precisa.",
          extracted: {},
          missingFields: ["title", "description", "category"],
          isComplete: false,
        },
        { status: 200 },
      )
    }

    console.log("[v0] Extracted info:", parsedResponse.extracted)

    return NextResponse.json(parsedResponse, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in extract-service-info:", error)
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 },
    )
  }
}
