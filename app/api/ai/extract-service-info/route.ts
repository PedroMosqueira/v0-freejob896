import { generateText, Output } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const officialCategories = [
  "Encanador", "Eletricista", "Pedreiro", "Pintor", "Montador de Móveis",
  "Marceneiro", "Serralheiro", "Limpeza", "Jardinagem", "Diarista",
  "Dedetização", "Ar Condicionado", "Vidraceiro", "Chaveiro", "Mudanças",
  "Técnico de Informática", "Cabeleireiro", "Manicure", "Costureira",
  "Professor Particular", "Outros",
] as const

const serviceSchema = z.object({
  title: z.string().describe("Título curto e específico, até 60 caracteres, sem ponto final"),
  description: z
    .string()
    .describe("Descrição clara em primeira pessoa, 2 a 4 frases, só com fatos informados pelo cliente"),
  category: z.enum(officialCategories),
  categoryConfidence: z.enum(["alta", "media", "baixa"]),
  clarifyingQuestion: z
    .string()
    .nullable()
    .describe("Uma pergunta curta se faltar algo essencial para o profissional orçar; senão null"),
})

const SYSTEM_PROMPT = `Você ajuda clientes de uma plataforma brasileira de serviços a montar um pedido para profissionais autônomos.

A partir do que o cliente escreveu (pode ter erros de digitação, gírias e frases soltas), gere:

TÍTULO
- Curto e específico, diz o serviço e o objeto: "Trocar resistência do chuveiro", "Instalar ar-condicionado split 12.000 BTUs", "Montar guarda-roupa de 6 portas".
- Nunca use "Solicitação de", "Preciso de" ou "Serviço de".

DESCRIÇÃO
- Primeira pessoa ("Preciso...", "Tenho..."), português correto, 2 a 4 frases.
- Reescreva com clareza o que o cliente disse: o problema, onde fica, tamanho/quantidade e urgência, quando informados.
- NÃO invente detalhes (marcas, medidas, prazos, urgência, valores, cômodos) que o cliente não disse.
- Não inclua localização nem saudações. Proibido encher linguiça: nada de "por um profissional qualificado", "o quanto antes", "atendimento de qualidade". Se o cliente disse pouco, 1 ou 2 frases bastam.

CATEGORIA (escolha a que o profissional realmente faria o serviço)
- Encanador: vazamento, cano, torneira, registro, descarga, caixa d'água, entupimento, esgoto, chuveiro vazando.
- Eletricista: tomada, interruptor, fiação, disjuntor, quadro de luz, iluminação, resistência de chuveiro queimada, instalar chuveiro elétrico, ventilador de teto.
- Ar Condicionado: instalação, limpeza, manutenção, recarga de gás de ar-condicionado.
- Pedreiro: alvenaria, reboco, contrapiso, piso, azulejo, porcelanato, muro, reforma, telhado, goteira ou infiltração vinda da chuva, impermeabilização.
- Pintor: pintura interna ou externa, textura, massa corrida, grafiato.
- Montador de Móveis: montar ou desmontar móveis prontos (guarda-roupa, cama, estante, móveis de loja).
- Marceneiro: móveis sob medida, conserto de móveis de madeira, portas de madeira.
- Serralheiro: portão, grade, estrutura metálica, solda.
- Vidraceiro: box de banheiro, janela de vidro, espelho, vidro quebrado.
- Chaveiro: abrir porta trancada, cópia de chave, trocar fechadura ou segredo.
- Limpeza: faxina pesada, pós-obra, limpeza de sofá, tapete ou estofado.
- Diarista: tarefas domésticas recorrentes (passar, cozinhar, arrumar a casa) por diária.
- Jardinagem: grama, poda, paisagismo, roçagem.
- Dedetização: baratas, cupins, ratos, escorpiões, mosquitos.
- Mudanças: frete, carreto, transporte de móveis.
- Técnico de Informática: computador, notebook, impressora, rede, Wi-Fi, celular.
- Use "Outros" só se nenhuma categoria servir. Na dúvida entre duas, escolha a do problema principal e marque confiança "media".

PERGUNTA
- Se faltar algo essencial para o profissional dar um preço (ex.: quantos aparelhos, tamanho do cômodo), faça UMA pergunta curta. Senão, null.`

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
const MODEL = groq("openai/gpt-oss-120b")

interface HistoryMessage {
  role: "user" | "assistant"
  content: string
}

function fallbackResponse(message: string) {
  const text = message.trim()
  return {
    message: "Não consegui usar a IA agora. Preenchi com o que você escreveu; confira e corrija se precisar.",
    extracted: {
      title: text.slice(0, 60) || "Serviço",
      description: text || "Preciso de um profissional para um serviço.",
      category: "Outros",
    },
    needsLocation: true,
    missingFields: [],
    isComplete: false,
  }
}

export async function POST(request: NextRequest) {
  let inputMessage = ""
  try {
    const body = await request.json()
    inputMessage = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : ""
    if (!inputMessage) {
      return NextResponse.json({ error: "Descreva o serviço que você precisa." }, { status: 400 })
    }

    const limit = await checkRateLimit([
      { key: `ai-extract:ip:${getClientIp(request)}`, limit: 30, windowSeconds: 10 * 60 },
      { key: `ai-extract:ip-day:${getClientIp(request)}`, limit: 200, windowSeconds: 24 * 60 * 60 },
    ])
    if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds)

    const history: HistoryMessage[] = Array.isArray(body?.conversationHistory)
      ? body.conversationHistory
          .filter(
            (m: HistoryMessage) =>
              (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string",
          )
          .slice(-10)
          .map((m: HistoryMessage) => ({ role: m.role, content: m.content.slice(0, 2000) }))
      : []

    const { output } = await generateText({
      model: MODEL,
      system: SYSTEM_PROMPT,
      messages: [...history, { role: "user", content: inputMessage }],
      output: Output.object({ schema: serviceSchema }),
      temperature: 0.2,
    })

    const reply = output.clarifyingQuestion
      ? `Entendi! Montei o pedido abaixo. Para o profissional orçar melhor: ${output.clarifyingQuestion}\n\nVocê pode responder clicando em "Corrigir" ou confirmar assim mesmo.`
      : "Entendi! Montei o pedido abaixo. Confira o título, a descrição e a categoria."

    return NextResponse.json({
      message: reply,
      extracted: {
        title: output.title.trim(),
        description: output.description.trim(),
        category: output.category,
      },
      categoryConfidence: output.categoryConfidence,
      needsLocation: true,
      missingFields: [],
      isComplete: false,
    })
  } catch (error) {
    console.error("Erro em extract-service-info:", error instanceof Error ? error.message : error)
    return NextResponse.json(fallbackResponse(inputMessage))
  }
}
