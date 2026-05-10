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
1. SEMPRE extrair automaticamente: title, description, category baseado na primeira mensagem do usuário
2. Se título não for claro, crie um automaticamente baseado no contexto
3. Se descrição não for detalhada, expanda com sugestões
4. Detectar categoria com base na descrição usando APENAS as categorias disponíveis listadas abaixo
5. Se a descrição não se enquadrar em nenhuma categoria específica, use "Outros"
6. Depois de extrair title/description/category, peça para confirmar localização
7. Fazer perguntas amigáveis APENAS para campos faltantes

Categorias disponíveis (use EXATAMENTE como estão aqui):
"Encanador", "Eletricista", "Pedreiro", "Pintor", "Montador de Móveis", "Marceneiro", "Serralheiro", "Limpeza", "Jardinagem", "Diarista", "Dedetização", "Ar Condicionado", "Vidraceiro", "Chaveiro", "Mudanças", "Técnico de Informática", "Cabeleireiro", "Manicure", "Costureira", "Professor Particular", "Outros"

Fluxo esperado:
- 1ª mensagem: extrair title, description, category → pedir para apertar botão de localização
- Após localização confirmada: pedir fotos
- Após fotos: confirmar e enviar

Responda em JSON com este formato:
{
  "message": "Sua resposta conversacional",
  "extracted": {
    "title": "Título do serviço (NUNCA null na 1ª extração)",
    "description": "Descrição completa (NUNCA null na 1ª extração)",
    "category": "Uma das categorias listadas acima (NUNCA null)",
    "city": "Cidade (ou null)",
    "state": "Estado/UF (ou null)",
    "neighborhood": "Bairro (ou null)"
  },
  "needsLocation": true/false,
  "missingFields": [],
  "isComplete": false
}

Importante: 
- Sempre responda APENAS com JSON válido, sem markdown.
- title, description, category DEVEM ser preenchidos na primeira mensagem.
- A categoria DEVE ser uma das listadas. Se não encontrar match perfeito, use "Outros".
- needsLocation = true quando precisar que o usuário clique no botão de localização.
- isComplete = true apenas quando tiver: title, description, category, city, neighborhood, state.`

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

    // Garantir que title, description, category são preenchidos na primeira mensagem
    const isFirstMessage = conversationHistory.length === 0
    if (isFirstMessage && (!parsedResponse.extracted.title || !parsedResponse.extracted.description || !parsedResponse.extracted.category)) {
      // Se não foram extraídos, fazer uma segunda tentativa
      console.warn("[v0] First message extraction incomplete, retrying...")
      
      parsedResponse.extracted.title = parsedResponse.extracted.title || "Serviço solicitado"
      parsedResponse.extracted.description = parsedResponse.extracted.description || message
      parsedResponse.extracted.category = parsedResponse.extracted.category || "Outros"
      parsedResponse.needsLocation = true
      parsedResponse.message = `Entendi! Você quer: "${parsedResponse.extracted.title}"\n\nAgora precisamos de sua localização. Clique no botão "Usar Minha Localização" para detectar onde você está.`
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
