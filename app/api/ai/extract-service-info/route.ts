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
  remote: z
    .enum(["sim", "nao", "talvez"])
    .describe("Se o serviço pode ser feito à distância (online): sim, nao, ou talvez quando realmente depende"),
  clarifyingQuestion: z
    .string()
    .nullable()
    .describe("Uma pergunta curta se faltar algo essencial para o profissional orçar ou se remote for talvez; senão null"),
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

REMOTO (campo remote)
- "nao": tudo que exige presença física — obras, pintura, elétrica, encanamento, limpeza, jardinagem, montagem, mudanças, chaveiro, beleza, conserto de aparelho no local etc. NUNCA pergunte se esses podem ser remotos.
- "sim": claramente feito à distância — design, criação de site, programação, tradução, revisão de texto, edição de vídeo, marketing digital, consultoria online, ou quando o cliente diz "online", "remoto", "por videochamada".
- "talvez": só quando realmente pode ser dos dois jeitos e o cliente não disse — ex.: aula particular, suporte de informática/configuração de software, consultoria, personal trainer. Nesse caso a pergunta deve ser se pode ser feito online/remotamente.
- Se o cliente já respondeu sobre isso na conversa, use a resposta dele (sim ou nao) e não pergunte de novo.

PERGUNTA
- Se faltar algo essencial para o profissional dar um preço (ex.: quantos aparelhos, tamanho do cômodo), faça UMA pergunta curta.
- Se remote for "talvez", pergunte se pode ser feito online (pode juntar com a outra pergunta numa frase curta).
- Não repita perguntas que o cliente já respondeu. Se nada faltar, null.

CONVERSA EM ANDAMENTO
- Se houver um PEDIDO ATUAL, o cliente está complementando ou corrigindo. Atualize título, descrição e categoria incorporando a nova informação, sem perder o que já foi dito antes (a menos que o cliente corrija).`

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

    const draft = body?.currentDraft
    const draftText =
      draft && typeof draft === "object" && typeof draft.title === "string"
        ? `\n\nPEDIDO ATUAL (atualize com o que o cliente disser agora):\nTítulo: ${String(draft.title).slice(0, 120)}\nDescrição: ${String(draft.description ?? "").slice(0, 1000)}\nCategoria: ${String(draft.category ?? "").slice(0, 60)}\nRemoto: ${draft.isRemote === true ? "sim" : draft.isRemote === false ? "nao" : "não definido"}`
        : ""
    const isFollowUp = draftText !== ""

    const { output } = await generateText({
      model: MODEL,
      system: SYSTEM_PROMPT + draftText,
      messages: [...history, { role: "user", content: inputMessage }],
      output: Output.object({ schema: serviceSchema }),
      temperature: 0.2,
    })

    const intro = isFollowUp ? "Pronto, atualizei o pedido." : "Entendi! Montei o pedido abaixo."
    const reply = output.clarifyingQuestion
      ? `${intro} ${output.clarifyingQuestion}\n\nPode responder aqui no chat ou confirmar assim mesmo.`
      : `${intro} Confira o título, a descrição e a categoria.`

    return NextResponse.json({
      message: reply,
      extracted: {
        title: output.title.trim(),
        description: output.description.trim(),
        category: output.category,
        ...(output.remote === "sim" ? { isRemote: true } : output.remote === "nao" ? { isRemote: false } : {}),
      },
      remoteUncertain: output.remote === "talvez",
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
