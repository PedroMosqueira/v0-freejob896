import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const groqApiKey = process.env.GROQ_API_KEY
const groq = createGroq({
  apiKey: groqApiKey,
})

const officialCategories = [
  "Encanador", "Eletricista", "Pedreiro", "Pintor", "Montador de Móveis",
  "Marceneiro", "Serralheiro", "Limpeza", "Jardinagem", "Diarista",
  "Dedetização", "Ar Condicionado", "Vidraceiro", "Chaveiro", "Mudanças",
  "Técnico de Informática", "Cabeleireiro", "Manicure", "Costureira",
  "Professor Particular", "Outros",
] as const

const categoryKeywords: Record<string, string[]> = {
  Encanador: ["encanador", "encanamento", "torneira", "vazamento", "cano", "pia", "chuveiro", "descarga"],
  Eletricista: ["eletricista", "eletrica", "elétrica", "eletricidade", "interruptor", "tomada", "fiação", "fiacao", "disjuntor", "lâmpada", "lampada", "curto circuito", "curto-circuito"],
  Pedreiro: ["pedreiro", "alvenaria", "reboco", "assentar tijolo", "tijolo", "cimento", "construir parede", "obra estrutural"],
  Pintor: ["pintor", "pintura", "pintar", "tinta", "parede com tinta", "pintura de parede", "pintura do quarto", "pintura da casa"],
  "Montador de Móveis": ["montar móvel", "montagem de móvel", "montador", "móvel planejado", "moveis"],
  Marceneiro: ["marcen", "madeira", "armário sob medida", "armario sob medida"],
  Serralheiro: ["serral", "portão", "portao", "grade", "ferro"],
  Limpeza: ["limpeza", "limpar", "faxina", "faxineir", "higienização", "higienizacao"],
  Jardinagem: ["jardin", "grama", "poda", "plantas", "jardim"],
  Diarista: ["diarista", "diária", "diaria"],
  Dedetização: ["dedet", "praga", "barata", "cupim", "inseto"],
  "Ar Condicionado": ["ar condicionado", "climatização", "climatizacao", "refriger"],
  Vidraceiro: ["vidra", "vidro", "box"],
  Chaveiro: ["chaveiro", "chave", "fechadura", "tranca"],
  Mudanças: ["mudança", "mudanca", "transportar móveis", "frete"],
  "Técnico de Informática": ["informática", "informatica", "computador", "notebook", "impressora", "celular"],
  Cabeleireiro: ["cabelo", "cabeleireiro", "corte de cabelo"],
  Manicure: ["manicure", "unha", "pedicure"],
  Costureira: ["costur", "ajuste de roupa", "barra de calça"],
  "Professor Particular": ["professor", "aula", "reforço", "reforco", "ensino"],
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function classifyService(text: string) {
  const normalized = normalizeText(text)
  const scores = officialCategories
    .filter((category) => category !== "Outros")
    .map((category) => {
      const score = (categoryKeywords[category] || []).reduce((total, keyword) => {
        const normalizedKeyword = normalizeText(keyword)
        if (!normalized.includes(normalizedKeyword)) return total
        return total + (normalizedKeyword.includes(" ") ? 4 : 2)
      }, 0)
      return { category, score }
    })
    .sort((a, b) => b.score - a.score)

  // Termos explícitos vencem palavras genéricas como “parede” ou “obra”.
  const explicitCategory = officialCategories.find((category) => {
    if (category === "Outros") return false
    return normalizeText(categoryKeywords[category]?.[0] || "") && normalized.includes(normalizeText(categoryKeywords[category][0]))
  })
  if (explicitCategory) return explicitCategory

  return scores[0]?.score > 0 ? scores[0].category : "Outros"
}

function correctContextualSpelling(text: string, category: string) {
  let corrected = text.trim()
  const normalizedCategory = category.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase()

  // Em serviços hidráulicos, “concertar” normalmente significa “consertar”.
  if (normalizedCategory === "encanador") {
    corrected = corrected.replace(/\bconcertar\b/gi, "consertar")
      .replace(/\bconcerto\b/gi, "conserto")
  }

  return corrected
}

export async function POST(request: NextRequest) {
  let inputMessage = ""
  try {
    if (!groqApiKey) {
      console.error("[v0] GROQ_API_KEY is not configured")
      return NextResponse.json(
        { error: "Serviço de IA não configurado" },
        { status: 503 },
      )
    }
    const { message, conversationHistory = [] } = await request.json()
    inputMessage = typeof message === "string" ? message.trim() : ""

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
      model: groq("llama-3.1-8b-instant"),
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
      maxOutputTokens: 500,
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

    // Normalizar a resposta para as categorias oficiais do site.
    const normalizedText = `${message} ${parsedResponse.extracted.title || ""} ${parsedResponse.extracted.description || ""}`
    // A mensagem original tem prioridade; texto expandido pela IA não pode
    // mudar a categoria por mencionar serviços relacionados incidentalmente.
    const originalCategory = classifyService(message)
    const suggestedCategory = originalCategory !== "Outros" ? originalCategory : classifyService(normalizedText)
    const rawDescription = String(parsedResponse.extracted.description || message).trim()
    const genericDescription = rawDescription.length >= 12
      ? rawDescription
      : `Solicito um profissional para realizar o serviço de ${message.trim() || "que preciso"}. Procuro um atendimento de qualidade, com orçamento e disponibilidade a combinar.`
    const genericTitle = String(parsedResponse.extracted.title || "").trim()
    const correctedTitle = genericTitle && genericTitle !== "Serviço solicitado"
      ? genericTitle.replace(/^solicitação de\\s+/i, "")
      : (message.trim() || "Serviço")
    parsedResponse.extracted = {
      ...parsedResponse.extracted,
      title: correctContextualSpelling(correctedTitle, suggestedCategory),
      description: correctContextualSpelling(genericDescription, suggestedCategory),
      category: suggestedCategory,
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
    console.error("[v0] Error in extract-service-info:", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    })
    const fallbackCategory = classifyService(inputMessage)
    const fallbackTitle = inputMessage || "Serviço"
    const fallbackDescription = inputMessage
      ? `Preciso de um profissional para realizar ${inputMessage}. Busco um serviço de qualidade, com orçamento e disponibilidade a combinar.`
      : "Preciso de um profissional para realizar um serviço. Busco um atendimento de qualidade, com orçamento e disponibilidade a combinar."
    return NextResponse.json({
      message: "Criei uma sugestão com base no que você escreveu. Confira os dados e confirme ou corrija antes de continuar.",
      extracted: {
        title: fallbackTitle,
        description: fallbackDescription,
        category: fallbackCategory,
      },
      needsLocation: true,
      missingFields: [],
      isComplete: false,
    }, { status: 200 })
  }
}
