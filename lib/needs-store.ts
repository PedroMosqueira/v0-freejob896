"use server" // Marca todas as funções neste arquivo como Server Actions

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { buildNotificationUrl, safeSendPush } from "@/lib/push-notifications-server"
import { sendNotificationEmail } from "@/lib/email-notifications"
import type {
  Need,
  NewNeedInput,
  ChatThread,
  ChatMessage,
  NeedStatus,
  NeedProposal,
  ProposalStatus,
  ProposalType,
} from "@/data/needs"
import { describeWithdrawLock, getWithdrawPolicy, type WithdrawPolicy } from "@/lib/withdraw-policy"
import { createAdminClient } from "@/lib/stripe-subscription-sync"

// Helper para mapear uma linha do Supabase para o tipo Need
// Não inclui mais o chat, pois ele está em uma tabela separada
function mapSupabaseNeedToNeedType(row: any, proposals: NeedProposal[] = []): Need {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    category: row.category,
    city: row.city,
    neighborhood: row.neighborhood || undefined,
    state: row.state || undefined,
    latitude: row.latitude || undefined,
    longitude: row.longitude || undefined,
    requesterEmail: row.requester_email,
    status: row.status as NeedStatus,
    createdAt: row.created_at,
    proposals: proposals,
    images: row.images || [],
  }
}

// Helper para mapear uma linha do Supabase para o tipo NeedProposal
function mapSupabaseProposalToNeedProposalType(row: any): NeedProposal {
  return {
    id: row.id,
    needId: row.need_id,
    professionalEmail: row.professional_email,
    type: row.type as ProposalType,
    message: row.message || undefined,
    whenISO: row.when_iso || undefined,
    status: row.status as ProposalStatus,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at || undefined,
    bidAmount: row.bid_amount || undefined,
  }
}

// Helper para mapear uma linha do Supabase para o tipo ChatThread
function mapSupabaseChatThreadToChatThreadType(
  row: any,
): ChatThread & { needTitle?: string; hasUnreadMessages?: boolean } {
  return {
    id: row.id,
    needId: row.need_id,
    requesterEmail: row.requester_email,
    professionalEmail: row.professional_email,
    messages: row.messages_json || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastReadByRequester: row.last_read_by_requester,
    lastReadByProfessional: row.last_read_by_professional,
    needTitle: row.needs?.title,
    hasUnreadMessages: false,
  }
}

export async function getNeeds(): Promise<Need[]> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from("needs")
      .select(
        `
       *,
       need_proposals (
         id, need_id, professional_email, type, message, when_iso, status, created_at, accepted_at, bid_amount
       )
     `,
      )
      .order("created_at", { ascending: false })

    if (error) {
      return []
    }

    return data.map((row) =>
      mapSupabaseNeedToNeedType(row, row.need_proposals.map(mapSupabaseProposalToNeedProposalType)),
    )
  } catch (e) {
    return []
  }
}

export async function getNeed(id: string): Promise<Need | undefined> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from("needs")
      .select(
        `
       *,
       need_proposals (
         id, need_id, professional_email, type, message, when_iso, status, created_at, accepted_at, bid_amount
       )
     `,
      )
      .eq("id", id)
      .single()

    if (error && error.code !== "PGRST116") {
      return undefined
    }

    if (!data) {
      return undefined
    }
    return mapSupabaseNeedToNeedType(data, data.need_proposals.map(mapSupabaseProposalToNeedProposalType))
  } catch (e) {
    return undefined
  }
}

export async function filterNeeds({
  q,
  cidade,
  categoria,
  status,
  requesterEmail,
  professionalEmail,
  limit = 20,
  offset = 0,
  near,
}: {
  q?: string
  cidade?: string
  categoria?: string
  status?: string
  requesterEmail?: string
  professionalEmail?: string
  limit?: number
  offset?: number
  near?: { latitude: number; longitude: number; radiusKm: number }
}): Promise<Need[]> {
  const supabase = await createSupabaseServerClient()

  if (professionalEmail) {
    const [proposalData, chatThreadData] = await Promise.all([
      supabase
        .from("need_proposals")
        .select("need_id")
        .eq("professional_email", professionalEmail)
        .or("status.eq.pending,status.eq.accepted_by_requester")
        .then((res) => res.data || []),
      supabase
        .from("chat_threads")
        .select("need_id")
        .eq("professional_email", professionalEmail)
        .then((res) => res.data || []),
    ])

    const proposalNeedIds = proposalData.map((p) => p.need_id)
    const chatNeedIds = chatThreadData.map((t) => t.need_id)
    const combinedNeedIds = [...new Set([...proposalNeedIds, ...chatNeedIds])]

    if (combinedNeedIds.length === 0) {
      return []
    }

    let query = supabase
      .from("needs")
      .select(
        `
     *,
     need_proposals!inner (
       id, need_id, professional_email, type, message, when_iso, status, created_at, accepted_at, bid_amount
     )
   `,
      )
      .in("id", combinedNeedIds)

    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    }
    if (cidade) {
      query = query.eq("city", cidade)
    }
    if (categoria) {
      query = query.eq("category", categoria)
    }
    if (status) {
      query = query.eq("status", status)
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data, error } = await query
    if (error) {
      console.error("Erro ao buscar pedidos (profissional):", error)
      throw new Error("Falha ao buscar pedidos.")
    }

    return (data || []) as Need[]
  }

  if (near && !requesterEmail) {
    const { data: nearby, error: nearbyError } = await supabase.rpc("search_nearby_needs", {
      p_lat: near.latitude,
      p_lng: near.longitude,
      p_radius_km: near.radiusKm,
      p_q: q || null,
      p_category: categoria || null,
      p_status: status || null,
      p_city: cidade || null,
      p_limit: limit,
      p_offset: offset,
    })

    if (nearbyError) {
      console.error("Erro ao buscar pedidos próximos:", nearbyError)
      throw new Error("Falha ao buscar pedidos próximos.")
    }

    const rows = (nearby || []) as { id: string; distance_km: number }[]
    if (rows.length === 0) return []

    const { data, error } = await supabase
      .from("needs")
      .select(
        `
     *,
     need_proposals (
       id, need_id, professional_email, type, message, when_iso, status, created_at, accepted_at, bid_amount
     )
   `,
      )
      .in(
        "id",
        rows.map((r) => r.id),
      )

    if (error) {
      console.error("Erro ao carregar pedidos próximos:", error)
      throw new Error("Falha ao buscar pedidos próximos.")
    }

    const byId = new Map(data.map((row) => [row.id, row]))
    return rows.flatMap(({ id, distance_km }) => {
      const row = byId.get(id)
      if (!row) return []
      const need = mapSupabaseNeedToNeedType(row, row.need_proposals.map(mapSupabaseProposalToNeedProposalType))
      return [{ ...need, distance: distance_km }]
    })
  }

  // Query normal para outros casos
  let query = supabase.from("needs").select(
    `
   *,
   need_proposals (
     id, need_id, professional_email, type, message, when_iso, status, created_at, accepted_at, bid_amount
   )
 `,
  )

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
  }
  if (cidade) {
    query = query.eq("city", cidade)
  }
  if (categoria) {
    query = query.eq("category", categoria)
  }
  if (status) {
    query = query.eq("status", status)
  }
  if (requesterEmail) {
    query = query.eq("requester_email", requesterEmail)
  }

  const { data, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

  if (error) {
    console.error("Erro ao filtrar pedidos:", error)
    throw new Error("Falha ao filtrar pedidos.")
  }

  return data.map((row) =>
    mapSupabaseNeedToNeedType(row, row.need_proposals.map(mapSupabaseProposalToNeedProposalType)),
  )
}

export async function addNeed(input: NewNeedInput): Promise<Need> {
  try {
    const supabase = await createSupabaseServerClient()
    const now = new Date().toISOString()
    const newId = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string

    const { data, error } = await supabase
      .from("needs")
      .insert({
        id: newId,
        title: input.title,
        description: input.description,
        category: input.category,
        city: input.city,
        neighborhood: input.neighborhood,
        state: input.state,
        latitude: input.latitude,
        longitude: input.longitude,
        requester_email: input.requesterEmail,
        status: "aberto",
        created_at: now,
        images: input.images || [],
      })
      .select("*")
      .single()

    if (error) {
      throw new Error(`Falha ao adicionar pedido: ${String(error.message || "Erro desconhecido")}`)
    }

    return mapSupabaseNeedToNeedType(data, [])
  } catch (e) {
    throw new Error(`Falha ao adicionar pedido: ${String(e)}`)
  }
}

export async function addNeedProposal(params: {
  needId: string
  professionalEmail: string
  type: ProposalType
  message?: string
  whenISO?: string
  bidAmount?: number
}): Promise<NeedProposal> {
  try {
    const supabase = await createSupabaseServerClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from("need_proposals")
      .insert({
        need_id: params.needId,
        professional_email: params.professionalEmail,
        type: params.type,
        message: params.message || undefined,
        when_iso: params.whenISO || undefined,
        status: params.type === "interest_only" ? "interested" : "pending",
        created_at: now,
        bid_amount: params.bidAmount,
      })
      .select("*")
      .single()

    if (error) {
      throw new Error(`Falha ao adicionar proposta: ${String(error.message || "Erro desconhecido")}`)
    }

    if (params.type === "interest_only") {
      const { data: needData } = await supabase
        .from("needs")
        .select("requester_email, title")
        .eq("id", params.needId)
        .single()

      if (needData) {
        console.log("[v0] Creating interest notification for:", needData.requester_email)
        const notificationResult = await createNotification(
          needData.requester_email,
          "Novo interesse em seu serviço",
          `Um profissional demonstrou interesse em "${needData.title}"`,
          "interest",
          params.needId,
          data.id,
        )
        console.log("[v0] Interest notification result:", notificationResult)
      }
    } else {
      const { data: needData } = await supabase
        .from("needs")
        .select("requester_email, title")
        .eq("id", params.needId)
        .single()

      if (needData) {
        const notificationResult = await createNotification(
          needData.requester_email,
          "Nova proposta recebida",
          `Você recebeu uma nova proposta para "${needData.title}"`,
          "proposal",
          params.needId,
          data.id,
        )
        if (!notificationResult) {
          throw new Error("Falha ao criar notificação para nova proposta.")
        }
      }
    }

    return mapSupabaseProposalToNeedProposalType(data)
  } catch (e) {
    throw new Error(`Falha ao adicionar proposta: ${String(e)}`)
  }
}

const OPEN_PROPOSAL_STATUSES = ["interested", "pending", "accepted_by_requester", "accepted_by_professional"]

/**
 * On an open request, the professional may only chat while holding an active
 * interest/bid. Once they withdraw, the chat stays read-only until they
 * express interest again. After acceptance the chat is always allowed.
 */
async function professionalHasOpenInterest(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  thread: { need_id: string; professional_email: string },
): Promise<boolean> {
  const { data: need } = await supabase.from("needs").select("status").eq("id", thread.need_id).maybeSingle()
  if (!need || need.status !== "aberto") return true

  const { data: open } = await supabase
    .from("need_proposals")
    .select("id")
    .eq("need_id", thread.need_id)
    .ilike("professional_email", thread.professional_email)
    .in("status", OPEN_PROPOSAL_STATUSES)
    .limit(1)

  return Boolean(open?.length)
}

export async function addChatMessage(params: {
  chatThreadId: string
  email: string
  text: string
}): Promise<ChatMessage> {
  try {
    const supabase = await createSupabaseServerClient()
    const now = new Date().toISOString()

    const { data: currentThread, error: fetchError } = await supabase
      .from("chat_threads")
      .select(
        "messages_json, requester_email, professional_email, need_id, last_read_by_requester, last_read_by_professional",
      )
      .eq("id", params.chatThreadId)
      .single()

    if (fetchError || !currentThread) {
      throw new Error("Thread de chat não encontrada ou erro ao buscar.")
    }

    const isThreadProfessional =
      String(currentThread.professional_email || "").toLowerCase() === String(params.email).toLowerCase()
    if (isThreadProfessional && !(await professionalHasOpenInterest(supabase, currentThread))) {
      throw new Error("Você desistiu deste serviço. Manifeste interesse novamente para voltar a conversar.")
    }

    const msg: ChatMessage = {
      id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string,
      email: String(params.email),
      text: String(params.text),
      createdAt: now,
      type: "user",
    }

    const existingMessages: ChatMessage[] = currentThread.messages_json || []
    const updatedMessages = [...existingMessages, msg]

    const { data, error } = await supabase
      .from("chat_threads")
      .update({
        messages_json: updatedMessages,
        updated_at: now,
      })
      .eq("id", params.chatThreadId)
      .select("messages_json")
      .single()

    if (error) {
      throw new Error(`Falha ao adicionar mensagem de chat: ${String(error.message || "Erro desconhecido")}`)
    }

    const senderEmail = String(msg.email || "").toLowerCase()
    const recipientEmail =
      String(currentThread.requester_email).toLowerCase() === senderEmail
        ? currentThread.professional_email
        : currentThread.requester_email
    if (recipientEmail) {
      const recipientIsRequester =
        String(currentThread.requester_email).toLowerCase() === String(recipientEmail).toLowerCase()
      const recipientLastRead = recipientIsRequester
        ? currentThread.last_read_by_requester
        : currentThread.last_read_by_professional
      const unread = getUnreadMessagesFor(String(recipientEmail), updatedMessages, recipientLastRead ?? null)
      await notifyNewChatMessage(String(recipientEmail), String(currentThread.need_id), msg.text, unread)
    }

    return msg
  } catch (e) {
    throw new Error(`Falha ao adicionar mensagem de chat: ${String(e)}`)
  }
}

// =================================================================================================
// NOVAS FUNÇÕES DE CHAT PARA A TABELA chat_threads
// =================================================================================================

/**
 * Busca um thread de chat específico entre um solicitante e um profissional para um dado serviço.
 * Se não existir, retorna undefined.
 */
export async function getChatThread(
  needId: string,
  requesterEmail: string,
  professionalEmail: string,
): Promise<ChatThread | undefined> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("chat_threads")
    .select("*")
    .eq("need_id", needId)
    .eq("requester_email", requesterEmail)
    .eq("professional_email", professionalEmail)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("[getChatThread] Erro ao buscar thread de chat:", error)
    throw new Error("Falha ao buscar thread de chat.")
  }

  if (!data) {
    return undefined
  }

  return mapSupabaseChatThreadToChatThreadType(data)
}

/**
 * Lista todos os threads de chat para um dado serviço, visíveis para o usuário logado.
 * Se o usuário for o solicitante, verá todos os chats com profissionais.
 * Se o usuário for um profissional, verá apenas o chat dele com o solicitante.
 */
export async function listChatThreadsForNeed(needId: string, currentUserEmail: string): Promise<ChatThread[]> {
  const supabase = await createSupabaseServerClient()
  const { data: needData, error: needError } = await supabase
    .from("needs")
    .select("requester_email")
    .eq("id", needId)
    .single()

  if (needError || !needData) {
    console.error("[listChatThreadsForNeed] Erro ao buscar need para listar chats:", needError)
    return []
  }

  let query = supabase.from("chat_threads").select("*").eq("need_id", needId)

  if (needData.requester_email === currentUserEmail) {
    query = query.eq("requester_email", currentUserEmail)
  } else {
    query = query.eq("professional_email", currentUserEmail).eq("requester_email", needData.requester_email)
  }

  const { data, error } = await query.order("updated_at", { ascending: false })

  if (error) {
    console.error("[listChatThreadsForNeed] Erro ao listar threads de chat:", error)
    throw new Error("Falha ao listar threads de chat.")
  }

  return data.map(mapSupabaseChatThreadToChatThreadType)
}

/**
 * NOVO: Lista TODOS os threads de chat para um dado usuário (seja ele solicitante ou profissional).
 * Now includes need title via join
 */
export async function listAllChatThreadsForUser(
  userEmail: string,
  options?: { limit?: number; offset?: number },
): Promise<ChatThread[]> {
  const supabase = await createSupabaseServerClient()

  const query = supabase
    .from("chat_threads")
    .select(`
      *,
      needs (
        title
      )
    `)
    .or(`requester_email.eq.${userEmail},professional_email.eq.${userEmail}`)

  const { data, error } = await query

  if (error) {
    console.error("[listAllChatThreadsForUser] Erro ao listar todos os threads de chat:", error)
    throw new Error("Falha ao listar todos os threads de chat.")
  }

  const threads = data.map(mapSupabaseChatThreadToChatThreadType)

  threads.sort((a, b) => {
    const aLastMsg = a.messages && a.messages.length > 0 ? a.messages[a.messages.length - 1].createdAt : a.createdAt
    const bLastMsg = b.messages && b.messages.length > 0 ? b.messages[b.messages.length - 1].createdAt : b.createdAt
    return new Date(bLastMsg).getTime() - new Date(aLastMsg).getTime()
  })

  if (options?.limit) {
    const start = options.offset || 0
    return threads.slice(start, start + options.limit)
  }

  return threads
}

/**
 * Inicia um novo thread de chat ou recupera um existente.
 * Garante que haja apenas um thread por (needId, requesterEmail, professionalEmail).
 */
export async function startChat(params: {
  needId: string
  requesterEmail: string
  professionalEmail: string
  reason?: "visit" | "direct" | "other"
  customText?: string
}): Promise<ChatThread> {
  try {
    const supabase = await createSupabaseServerClient()
    const now = new Date().toISOString()

    const existingThread = await getChatThread(params.needId, params.requesterEmail, params.professionalEmail)

    if (existingThread) {
      return existingThread
    }

    const defaultText =
      params.reason === "visit"
        ? "Profissional abriu o chat para avaliar o serviço no local. Conversem para acertar horário e valor."
        : params.reason === "direct"
          ? "Profissional abriu o chat para combinar os últimos detalhes do serviço."
          : "Chat aberto. Conversem para combinar detalhes."

    const systemMsg: ChatMessage = {
      id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string,
      text: String(params.customText?.trim() || defaultText),
      createdAt: now,
      type: "system",
    }

    const insertData = {
      need_id: params.needId,
      requester_email: params.requesterEmail,
      professional_email: params.professionalEmail,
      messages_json: [systemMsg],
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase.from("chat_threads").insert(insertData).select("*").single()

    if (error) {
      throw new Error(`Falha ao iniciar chat: ${String(error.message || "Erro desconhecido")}`)
    }

    return mapSupabaseChatThreadToChatThreadType(data)
  } catch (e) {
    throw new Error(`Falha ao iniciar chat: ${String(e)}`)
  }
}

/**
 * Busca um thread de chat específico pelo seu ID.
 * Added pagination support - now supports limit and offset for messages
 */
export async function getChatThreadById(
  id: string,
  options?: { limit?: number; offset?: number },
): Promise<ChatThread | undefined> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from("chat_threads").select("*").eq("id", id).single()

  if (error && error.code !== "PGRST116") {
    console.error("[getChatThreadById] Erro ao buscar thread de chat por ID:", error)
    throw new Error("Falha ao buscar thread de chat por ID.")
  }

  if (!data) {
    return undefined
  }

  const thread = mapSupabaseChatThreadToChatThreadType(data)

  if (options?.limit) {
    const allMessages = thread.messages || []
    const totalMessages = allMessages.length
    const startIndex = Math.max(0, totalMessages - (options.offset || 0) - options.limit)
    const endIndex = totalMessages - (options.offset || 0)
    thread.messages = allMessages.slice(startIndex, endIndex)
  }

  return thread
}

export async function updateNeedStatus(needId: string, newStatus: NeedStatus, requesterEmail: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: needData, error: needError } = await supabase
      .from("needs")
      .select("requester_email, title")
      .eq("id", needId)
      .single()

    if (needError || !needData) {
      throw new Error("Pedido não encontrado.")
    }

    if (needData.requester_email !== requesterEmail) {
      throw new Error("Apenas o solicitante pode alterar o status do pedido.")
    }

    const { error } = await supabase.from("needs").update({ status: newStatus }).eq("id", needId)

    if (error) {
      throw new Error(`Falha ao atualizar status: ${String(error.message || "Erro desconhecido")}`)
    }

    if (newStatus === "concluido") {
      const { data: proposals } = await supabase
        .from("need_proposals")
        .select("professional_email")
        .eq("need_id", needId)
        .eq("status", "accepted_by_requester")

      if (proposals && proposals.length > 0) {
        for (const proposal of proposals) {
          const notificationResult = await createNotification(
            proposal.professional_email,
            "Serviço concluído",
            `O serviço "${needData.title}" foi marcado como concluído`,
            "completion",
            needId,
          )
          if (!notificationResult) {
            throw new Error("Falha ao criar notificação para serviço concluído.")
          }
        }
      }
    }

    console.log(`[updateNeedStatus] Status do pedido ${needId} atualizado para ${newStatus}`)
  } catch (e) {
    throw new Error(`Falha ao atualizar status: ${String(e)}`)
  }
}

const ACCEPTED_PROPOSAL_STATUSES = ["accepted_by_requester", "accepted_by_professional"]

/**
 * The chosen professional marks the job as done. The request moves to
 * "aguardando_avaliacao", which frees their simultaneous-service slot right away
 * (see lib/simultaneous-interests.ts); the requester then rates it or reports it
 * was not done, which only affects the professional's reputation.
 */
export async function professionalMarkCompleted(needId: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase()
  if (!email) throw new Error("Você precisa estar autenticado.")

  // Professionals cannot update needs under RLS; access is verified below before writing.
  const admin = createAdminClient()

  const { data: need } = await admin
    .from("needs")
    .select("id, title, status, requester_email")
    .eq("id", needId)
    .maybeSingle()
  if (!need) throw new Error("Pedido não encontrado.")
  if (need.status !== "aceito") throw new Error("Só é possível concluir um serviço em execução.")

  const { data: accepted } = await admin
    .from("need_proposals")
    .select("id")
    .eq("need_id", needId)
    .ilike("professional_email", email)
    .in("status", ACCEPTED_PROPOSAL_STATUSES)
    .limit(1)
  if (!accepted?.length) throw new Error("Apenas o profissional escolhido pode concluir este serviço.")

  const { error } = await admin
    .from("needs")
    .update({ status: "aguardando_avaliacao", completed_by_professional_at: new Date().toISOString() })
    .eq("id", needId)
    .eq("status", "aceito")
  if (error) throw new Error(`Falha ao concluir o serviço: ${error.message}`)

  await createNotification(
    String(need.requester_email),
    "Serviço concluído pelo profissional",
    `O profissional marcou "${need.title}" como concluído. Avalie o serviço ou informe se ele não foi feito.`,
    "completion",
    needId,
  )
}

/**
 * The requester reports that the job marked as done was not actually done.
 * Recorded as a 1-star rating so it weighs on the professional's reputation,
 * without touching their simultaneous-service slots.
 */
export async function requesterReportServiceNotDone(needId: string, details?: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) throw new Error("Você precisa estar autenticado.")

  const { data: need } = await supabase
    .from("needs")
    .select("id, title, status, requester_email")
    .eq("id", needId)
    .maybeSingle()
  if (!need || String(need.requester_email).toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("Apenas o solicitante pode informar que o serviço não foi feito.")
  }
  if (need.status !== "aguardando_avaliacao") {
    throw new Error("Este serviço não está aguardando avaliação.")
  }

  const { data: accepted } = await supabase
    .from("need_proposals")
    .select("professional_email")
    .eq("need_id", needId)
    .in("status", ACCEPTED_PROPOSAL_STATUSES)
    .limit(1)
    .maybeSingle()
  if (!accepted?.professional_email) throw new Error("Profissional do serviço não encontrado.")

  const trimmed = details?.trim().slice(0, 500)
  const { data: existingRating } = await supabase
    .from("ratings")
    .select("id")
    .eq("need_id", needId)
    .eq("rater_user_email", user.email)
    .maybeSingle()

  if (!existingRating) {
    const { error: ratingError } = await supabase.from("ratings").insert({
      rated_user_email: accepted.professional_email,
      rater_user_email: user.email,
      need_id: needId,
      rating: 1,
      comment: trimmed
        ? `Serviço não realizado: ${trimmed}`
        : "O cliente informou que o serviço não foi realizado.",
    })
    if (ratingError) throw new Error(`Falha ao registrar a avaliação: ${ratingError.message}`)
  }

  const { error } = await supabase.from("needs").update({ status: "nao_realizado" }).eq("id", needId)
  if (error) throw new Error(`Falha ao atualizar o pedido: ${error.message}`)

  await createNotification(
    String(accepted.professional_email),
    "Cliente informou que o serviço não foi feito",
    `O cliente informou que "${need.title}" não foi realizado. Isso foi registrado na sua avaliação.`,
    "completion",
    needId,
  )
}

export async function cancelNeed(needId: string, requesterEmail: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: needData, error: needError } = await supabase
      .from("needs")
      .select("requester_email, title, status")
      .eq("id", needId)
      .single()

    if (needError || !needData) {
      throw new Error("Pedido não encontrado.")
    }

    if (needData.requester_email !== requesterEmail) {
      throw new Error("Apenas o solicitante pode cancelar o pedido.")
    }

    if (needData.status === "concluido") {
      throw new Error("Não é possível cancelar um serviço já concluído.")
    }

    if (needData.status === "cancelado") {
      throw new Error("Este serviço já está cancelado.")
    }

    const { error } = await supabase.from("needs").update({ status: "cancelado" }).eq("id", needId)

    if (error) {
      throw new Error(`Falha ao cancelar serviço: ${String(error.message || "Erro desconhecido")}`)
    }

    const { data: proposals } = await supabase
      .from("need_proposals")
      .select("professional_email")
      .eq("need_id", needId)
      .in("status", ["pending", "accepted_by_requester"])

    if (proposals && proposals.length > 0) {
      for (const proposal of proposals) {
        await createNotification(
          proposal.professional_email,
          "Serviço cancelado",
          `O serviço "${needData.title}" foi cancelado pelo solicitante`,
          "cancellation",
          needId,
        )
      }
    }

    console.log(`[cancelNeed] Serviço ${needId} cancelado com sucesso`)
  } catch (e) {
    throw new Error(`Falha ao cancelar serviço: ${String(e)}`)
  }
}

export async function updateNeed(params: {
  needId: string
  requesterEmail: string
  title?: string
  description?: string
  category?: string
  images?: string[]
  city?: string
  state?: string
  neighborhood?: string
  latitude?: number
  longitude?: number
}): Promise<Need> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: needData, error: needError } = await supabase
      .from("needs")
      .select("requester_email, status")
      .eq("id", params.needId)
      .single()

    if (needError || !needData) {
      throw new Error("Pedido não encontrado.")
    }

    if (needData.requester_email !== params.requesterEmail) {
      throw new Error("Apenas o solicitante pode editar o pedido.")
    }

    const updateData: any = {}
    if (params.title !== undefined) updateData.title = params.title
    if (params.description !== undefined) updateData.description = params.description
    if (params.category !== undefined) updateData.category = params.category
    if (params.images !== undefined) updateData.images = params.images
    if (params.city !== undefined) updateData.city = params.city
    if (params.state !== undefined) updateData.state = params.state
    if (params.neighborhood !== undefined) updateData.neighborhood = params.neighborhood
    if (params.latitude !== undefined) updateData.latitude = params.latitude
    if (params.longitude !== undefined) updateData.longitude = params.longitude

    const { data: updatedNeed, error: updateError } = await supabase
      .from("needs")
      .update(updateData)
      .eq("id", params.needId)
      .select(`
        *,
        need_proposals (
          id, need_id, professional_email, type, message, when_iso, status, created_at, accepted_at, bid_amount
        )
      `)
      .single()

    if (updateError) {
      throw new Error(`Falha ao atualizar pedido: ${String(updateError.message || "Erro desconhecido")}`)
    }

    console.log(`[updateNeed] Pedido ${params.needId} atualizado com sucesso`)
    return mapSupabaseNeedToNeedType(updatedNeed, updatedNeed.need_proposals.map(mapSupabaseProposalToNeedProposalType))
  } catch (e) {
    throw new Error(`Falha ao atualizar pedido: ${String(e)}`)
  }
}

export async function acceptProposal(proposalId: string, needId: string, requesterEmail: string): Promise<void> {
  try {
    console.log("[v0] acceptProposal called with:", { proposalId, needId, requesterEmail })
    const supabase = await createSupabaseServerClient()

    const { data: needData, error: needError } = await supabase
      .from("needs")
      .select("requester_email, title, status")
      .eq("id", needId)
      .single()

    if (needError || !needData) {
      throw new Error("Pedido não encontrado.")
    }

    if (needData.requester_email !== requesterEmail) {
      throw new Error("Apenas o solicitante pode aceitar propostas.")
    }

    if (needData.status !== "aberto" && needData.status !== "aceito") {
      throw new Error("Apenas pedidos abertos ou em avaliação podem ter propostas aceitas.")
    }

    const { data: proposalData, error: proposalError } = await supabase
      .from("need_proposals")
      .select("professional_email, status")
      .eq("id", proposalId)
      .single()

    if (proposalError || !proposalData) {
      throw new Error("Proposta não encontrada.")
    }

    const isPostVisitBid = proposalData.status === "accepted_by_professional"

    const { error: updateProposalError } = await supabase
      .from("need_proposals")
      .update({ status: "accepted_by_requester", accepted_at: new Date().toISOString() })
      .eq("id", proposalId)

    if (updateProposalError) {
      throw new Error(`Falha ao atualizar proposta: ${String(updateProposalError.message || "Erro desconhecido")}`)
    }

    const chatThread = await getChatThread(needId, needData.requester_email, proposalData.professional_email)
    if (chatThread) {
      const messages = chatThread.messages || []
      const updatedMessages = messages.map((msg: ChatMessage) => {
        if (msg.metadata?.proposalId === proposalId) {
          return {
            ...msg,
            metadata: {
              ...msg.metadata,
              status: "accepted",
            },
          }
        }
        return msg
      })

      await supabase
        .from("chat_threads")
        .update({
          messages_json: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chatThread.id)

      console.log("[v0] Updated chat message status to accepted")
    }

    if (needData.status !== "aceito") {
      const { error: updateNeedError } = await supabase.from("needs").update({ status: "aceito" }).eq("id", needId)

      if (updateNeedError) {
        throw new Error(`Falha ao aceitar serviço: ${String(updateNeedError.message || "Erro desconhecido")}`)
      }
    }

    const notificationTitle = isPostVisitBid ? "Proposta de valor aceita!" : "Proposta aceita!"
    const notificationMessage = isPostVisitBid
      ? `Sua proposta de valor para "${needData.title}" foi aceita pelo solicitante. O serviço está pronto para iniciar!`
      : `Sua proposta para "${needData.title}" foi aceita pelo solicitante`

    const notificationResult = await createNotification(
      proposalData.professional_email,
      notificationTitle,
      notificationMessage,
      "proposal",
      needId,
      proposalId,
    )

    if (!notificationResult) {
      console.error("Falha ao criar notificação para proposta aceita")
    }

    console.log("[v0] acceptProposal completed successfully")
  } catch (e) {
    console.error("[v0] acceptProposal error:", e)
    throw new Error(`Falha ao aceitar proposta: ${String(e)}`)
  }
}

export async function declineProposal(proposalId: string) {
  console.log("[v0] declineProposal called with proposalId:", proposalId)
  const supabase = await createSupabaseServerClient()

  const { data: proposal, error: proposalError } = await supabase
    .from("need_proposals")
    .select("professional_email, need_id, status")
    .eq("id", proposalId)
    .single()

  if (proposalError || !proposal) {
    console.error("[v0] Proposal not found:", proposalError)
    throw new Error("Proposta não encontrada")
  }

  console.log("[v0] Proposal found:", proposal)

  const { error: updateError } = await supabase
    .from("need_proposals")
    .update({ status: "declined_by_requester" })
    .eq("id", proposalId)

  if (updateError) {
    console.error("[v0] Error updating proposal:", updateError)
    throw updateError
  }

  console.log("[v0] Proposal updated to declined_by_requester")

  const { data: needData } = await supabase.from("needs").select("requester_email").eq("id", proposal.need_id).single()

  if (needData) {
    const chatThread = await getChatThread(proposal.need_id, needData.requester_email, proposal.professional_email)

    if (chatThread) {
      console.log("[v0] Chat thread found, updating messages...")
      const messages = chatThread.messages || []
      const updatedMessages = messages.map((msg: ChatMessage) => {
        if (msg.metadata?.proposalId === proposalId) {
          return {
            ...msg,
            metadata: {
              ...msg.metadata,
              status: "declined",
            },
          }
        }
        return msg
      })

      await supabase
        .from("chat_threads")
        .update({
          messages_json: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chatThread.id)

      console.log("[v0] Chat message status updated to declined")
    }

    const { data: needTitle } = await supabase.from("needs").select("title").eq("id", proposal.need_id).single()

    if (needTitle) {
      await createNotification(
        proposal.professional_email,
        "Proposta recusada",
        `Sua proposta para "${needTitle.title}" foi recusada`,
        "proposal",
        proposal.need_id,
        proposalId,
      )
    }
  }

  console.log("[v0] declineProposal completed successfully")
}

export async function professionalRespondToVisit(params: {
  proposalId: string
  needId: string
  professionalEmail: string
  accepted: boolean
  message?: string
  bidAmount?: number
}): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: proposalData, error: proposalError } = await supabase
      .from("need_proposals")
      .select("professional_email, need_id, status, type")
      .eq("id", params.proposalId)
      .single()

    if (proposalError || !proposalData) {
      throw new Error("Proposta não encontrada.")
    }

    if (proposalData.professional_email !== params.professionalEmail) {
      throw new Error("Apenas o profissional responsável pode responder à visita.")
    }

    if (proposalData.status !== "accepted_by_requester") {
      throw new Error("Apenas propostas aceitas pelo solicitante podem ser respondidas.")
    }

    if (proposalData.type !== "visit_proposal") {
      throw new Error("Apenas propostas de visita podem ser aceitas ou recusadas pelo profissional.")
    }

    const { data: needData, error: needError } = await supabase
      .from("needs")
      .select("requester_email, title")
      .eq("id", params.needId)
      .single()

    if (needError || !needData) {
      throw new Error("Serviço não encontrado.")
    }

    if (params.accepted) {
      const pricing = params.bidAmount
        ? {
            bid_amount: params.bidAmount,
          }
        : {}

      const { error: updateProposalError } = await supabase
        .from("need_proposals")
        .update({
          status: "accepted_by_professional",
          accepted_at: new Date().toISOString(),
          ...pricing,
        })
        .eq("id", params.proposalId)

      if (updateProposalError) {
        throw new Error(`Falha ao atualizar proposta: ${String(updateProposalError.message || "Erro desconhecido")}`)
      }

      await createNotification(
        needData.requester_email,
        "Profissional aceitou o serviço",
        `O profissional aceitou realizar o serviço "${needData.title}" após a visita e enviou uma proposta de valor${params.message ? `: ${params.message}` : ""}`,
        "proposal",
        params.needId,
        params.proposalId,
      )

      if (params.message) {
        const thread = await getChatThread(params.needId, needData.requester_email, params.professionalEmail)
        if (thread) {
          await addChatMessage({
            chatThreadId: thread.id,
            email: params.professionalEmail,
            text: `✅ Serviço aceito após visita: ${params.message}`,
          })
        }
      }
    } else {
      const { error: updateNeedError } = await supabase
        .from("needs")
        .update({ status: "aberto" })
        .eq("id", params.needId)

      if (updateNeedError) {
        throw new Error(`Falha ao recusar serviço: ${String(updateNeedError.message || "Erro desconhecido")}`)
      }

      const { error: updateProposalError } = await supabase
        .from("need_proposals")
        .update({ status: "declined_by_professional", cancelled_at: new Date().toISOString() })
        .eq("need_id", params.needId)
        .eq("professional_email", params.professionalEmail)
        .in("status", ["pending", "accepted_by_requester"])

      if (updateProposalError) {
        throw new Error(`Falha ao atualizar proposta: ${String(updateProposalError.message || "Erro desconhecido")}`)
      }

      await createNotification(
        needData.requester_email,
        "Profissional recusou o serviço",
        `O profissional recusou realizar o serviço "${needData.title}" após a visita${params.message ? `: ${params.message}` : ""}`,
        "proposal",
        params.needId,
        params.proposalId,
      )

      if (params.message) {
        const thread = await getChatThread(params.needId, needData.requester_email, params.professionalEmail)
        if (thread) {
          await addChatMessage({
            chatThreadId: thread.id,
            email: params.professionalEmail,
            text: `❌ Serviço recusado após visita: ${params.message}`,
          })
        }
      }
    }

    console.log(
      `[professionalRespondToVisit] Profissional ${params.accepted ? "aceitou" : "recusou"} o serviço ${params.needId}`,
    )
  } catch (e) {
    throw new Error(`Falha ao responder à visita: ${String(e)}`)
  }
}

export async function markChatAsRead(chatThreadId: string, userEmail: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: thread, error: fetchError } = await supabase
      .from("chat_threads")
      .select("requester_email, professional_email, last_read_by_requester, last_read_by_professional")
      .eq("id", chatThreadId)
      .single()

    if (fetchError || !thread) {
      throw new Error("Thread de chat não encontrada")
    }

    const now = new Date().toISOString()
    const updateField = thread.requester_email === userEmail ? "last_read_by_requester" : "last_read_by_professional"

    const { error } = await supabase
      .from("chat_threads")
      .update({ [updateField]: now })
      .eq("id", chatThreadId)
      .select()

    if (error) {
      throw new Error(`Falha ao marcar chat como lido: ${error.message}`)
    }
  } catch (e) {
    console.error("[markChatAsRead] error:", e)
    throw new Error(`Falha ao marcar chat como lido: ${String(e)}`)
  }
}

export async function professionalCancelService(params: {
  needId: string
  professionalEmail: string
  reason?: string
}): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: proposalData, error: proposalError } = await supabase
      .from("need_proposals")
      .select("id, professional_email, status")
      .eq("need_id", params.needId)
      .eq("professional_email", params.professionalEmail)
      .in("status", ["accepted_by_requester", "accepted_by_professional"])
      .single()

    if (proposalError || !proposalData) {
      throw new Error("Você não tem permissão para cancelar este serviço.")
    }

    const { data: needData, error: needError } = await supabase
      .from("needs")
      .select("requester_email, title, status")
      .eq("id", params.needId)
      .single()

    if (needError || !needData) {
      throw new Error("Serviço não encontrado.")
    }

    if (needData.status === "concluido") {
      throw new Error("Não é possível cancelar um serviço já concluído.")
    }

    if (needData.status === "cancelado") {
      throw new Error("Este serviço já está cancelado.")
    }

    // cancelled_at keeps the simultaneous slot held for 2h after a professional cancels.
    // Also closes their original pending interest/bid so it stops holding a slot.
    const { error: updateProposalError } = await supabase
      .from("need_proposals")
      .update({ status: "declined_by_professional", cancelled_at: new Date().toISOString() })
      .eq("need_id", params.needId)
      .eq("professional_email", params.professionalEmail)
      .in("status", ["pending", "accepted_by_requester", "accepted_by_professional"])

    if (updateProposalError) {
      throw new Error(`Falha ao cancelar serviço: ${updateProposalError.message}`)
    }

    const { error: updateNeedError } = await supabase.from("needs").update({ status: "aberto" }).eq("id", params.needId)

    if (updateNeedError) {
      throw new Error(`Falha ao atualizar status do serviço: ${updateNeedError.message}`)
    }

    await createNotification(
      needData.requester_email,
      "Profissional cancelou o serviço",
      `O profissional cancelou o serviço "${needData.title}"${params.reason ? `: ${params.reason}` : ""}`,
      "cancellation",
      params.needId,
      proposalData.id,
    )

    const thread = await getChatThread(params.needId, needData.requester_email, params.professionalEmail)
    if (thread && params.reason) {
      await addChatMessage({
        chatThreadId: thread.id,
        email: params.professionalEmail,
        text: `❌ Cancelamento do serviço: ${params.reason}`,
      })
    }

    console.log(`[professionalCancelService] Profissional cancelou o serviço ${params.needId}`)
  } catch (e) {
    throw new Error(`Falha ao cancelar serviço: ${String(e)}`)
  }
}

type WithdrawContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
  professionalEmail: string
  need: { id: string; requester_email: string; title: string; status: string }
  openProposalIds: string[]
  policy: WithdrawPolicy
}

/**
 * Loads everything needed to decide if the signed-in professional can withdraw
 * from an open request. Returns null when there is nothing to withdraw.
 */
async function loadWithdrawContext(needId: string): Promise<WithdrawContext | null> {
  const supabase = await createSupabaseServerClient()
  const { data: authData } = await supabase.auth.getUser()
  const professionalEmail = authData.user?.email
  if (!professionalEmail) throw new Error("Faça login para continuar.")

  const { data: need, error: needError } = await supabase
    .from("needs")
    .select("id, requester_email, title, status")
    .eq("id", needId)
    .single()

  // Once accepted, cancelling goes through professionalCancelService instead.
  if (needError || !need || need.status !== "aberto") return null

  const { data: proposals, error: proposalsError } = await supabase
    .from("need_proposals")
    .select("id, type, status, created_at, bid_amount")
    .eq("need_id", needId)
    .ilike("professional_email", professionalEmail)
    .order("created_at", { ascending: true })

  if (proposalsError) throw new Error(`Falha ao carregar propostas: ${proposalsError.message}`)

  // Interests are saved as "interested"; bids, visits and quotes as "pending".
  const openProposalIds = (proposals || [])
    .filter((p) => p.status === "pending" || p.status === "interested")
    .map((p) => String(p.id))
  if (!openProposalIds.length) return null

  const bids = (proposals || []).filter((p) => p.type === "direct_acceptance" && p.bid_amount != null)
  const latestBid = bids.at(-1)
  const thread = await getChatThread(needId, need.requester_email, professionalEmail)

  const policy = getWithdrawPolicy({
    interestSentAt: String(proposals![0].created_at),
    requesterViewedAt: thread?.lastReadByRequester ? String(thread.lastReadByRequester) : null,
    latestBid: latestBid ? { sentAt: String(latestBid.created_at), status: String(latestBid.status) } : null,
  })

  return { supabase, professionalEmail, need, openProposalIds, policy }
}

/** Whether the signed-in professional can withdraw from this request right now. */
export async function getProfessionalWithdrawStatus(needId: string): Promise<WithdrawPolicy | null> {
  const context = await loadWithdrawContext(needId)
  return context?.policy ?? null
}

/**
 * Professional withdraws interest (and any pending bid) from an open request.
 * Enforced server-side with the same policy shown in the UI. The slot stays
 * held for 2h via cancelled_at.
 */
export async function professionalWithdrawInterest(params: { needId: string; reason?: string }): Promise<void> {
  const context = await loadWithdrawContext(params.needId)
  if (!context) throw new Error("Não há interesse ativo para desistir neste pedido.")

  const { supabase, professionalEmail, need, openProposalIds, policy } = context
  if (!policy.allowed) throw new Error(describeWithdrawLock(policy))

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from("need_proposals")
    // No cancelled_at: withdrawing from an open request frees the slot immediately.
    // The 2h rule only applies before the requester views the interest (see withdraw-policy).
    .update({ status: "declined_by_professional" })
    .in("id", openProposalIds)

  if (updateError) throw new Error(`Falha ao desistir: ${updateError.message}`)

  const thread = await getChatThread(need.id, need.requester_email, professionalEmail)
  if (thread) {
    const reason = params.reason?.trim()
    const messages: ChatMessage[] = (thread.messages || []).map((msg) =>
      msg.type === "bid" && msg.email === professionalEmail && msg.metadata?.status === "pending"
        ? { ...msg, metadata: { ...msg.metadata, status: "cancelled" } }
        : msg,
    )
    messages.push({
      id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string,
      text: reason ? `O profissional desistiu do serviço: ${reason}` : "O profissional desistiu do serviço.",
      createdAt: now,
      type: "system",
    })

    await supabase.from("chat_threads").update({ messages_json: messages, updated_at: now }).eq("id", thread.id)
  }

  await createNotification(
    need.requester_email,
    "Profissional desistiu",
    `Um profissional desistiu do seu pedido "${need.title}".`,
    "cancellation",
    need.id,
    openProposalIds[0],
  )
}

const MAX_PUSH_PREVIEW_LINES = 5

/** Messages from the other party that the recipient hasn't read yet, oldest first. */
function getUnreadMessagesFor(recipientEmail: string, messages: ChatMessage[], lastReadAt: string | null): ChatMessage[] {
  const recipient = recipientEmail.toLowerCase()
  const lastRead = lastReadAt ? new Date(lastReadAt).getTime() : 0
  return messages.filter(
    (msg) =>
      msg.type === "user" &&
      msg.email &&
      msg.email.toLowerCase() !== recipient &&
      new Date(msg.createdAt).getTime() > lastRead,
  )
}

function buildChatPushBody(unread: ChatMessage[], fallbackText: string): string {
  const lines = (unread.length ? unread : [{ text: fallbackText } as ChatMessage])
    .slice(-MAX_PUSH_PREVIEW_LINES)
    .map((msg) => (msg.text.length > 80 ? `${msg.text.slice(0, 80)}...` : msg.text))
  const hidden = unread.length - lines.length
  return hidden > 0 ? `+${hidden} anteriores\n${lines.join("\n")}` : lines.join("\n")
}

/**
 * Notifies the other party about a new chat message. The in-app bell keeps a single
 * unread entry per conversation. The push uses one tag per chat, so the phone shows a
 * single alert per conversation listing only the messages still unread in it.
 */
async function notifyNewChatMessage(
  recipientEmail: string,
  needId: string,
  text: string,
  unread: ChatMessage[] = [],
): Promise<void> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) return

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const [{ count }, { data: need }] = await Promise.all([
      admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", recipientEmail)
        .eq("related_need_id", needId)
        .eq("type", "message")
        .eq("is_read", false),
      admin.from("needs").select("title").eq("id", needId).single(),
    ])

    const preview = text.length > 80 ? `${text.slice(0, 80)}...` : text
    const bellTitle = need?.title ? `Nova mensagem em "${need.title}"` : "Nova mensagem"
    const unreadCount = Math.max(unread.length, 1)
    const pushTitle =
      unreadCount > 1
        ? `${unreadCount} novas mensagens${need?.title ? ` em "${need.title}"` : ""}`
        : bellTitle

    if (!count) {
      await insertNotificationRow(recipientEmail, bellTitle, preview, "message", needId)
    }

    await safeSendPush(recipientEmail, {
      title: pushTitle,
      body: buildChatPushBody(unread, text),
      tag: `chat-${needId}`,
      data: { url: buildNotificationUrl(needId) },
    })
  } catch (error) {
    console.error("[needs-store] Failed to notify new chat message:", error)
  }
}

/**
 * Creates a bell notification and sends a matching push. Each event gets its own push
 * (no shared tag), so a new bid or acceptance never replaces an alert already on screen.
 */
async function createNotification(
  userEmail: string,
  title: string,
  message: string,
  type: string,
  relatedNeedId?: string,
  relatedProposalId?: string,
): Promise<boolean> {
  const created = await insertNotificationRow(userEmail, title, message, type, relatedNeedId, relatedProposalId)
  if (created) {
    const url = buildNotificationUrl(relatedNeedId)
    await Promise.all([
      safeSendPush(userEmail, { title, body: message, data: { url } }),
      sendNotificationEmail(userEmail, { title, message, url }),
    ])
  }
  return created
}

async function insertNotificationRow(
  userEmail: string,
  title: string,
  message: string,
  type: string,
  relatedNeedId?: string,
  relatedProposalId?: string,
): Promise<boolean> {
  try {
    console.log("[v0] 🔔 Creating notification:", { userEmail, title, message, type, relatedNeedId, relatedProposalId })

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[v0] ❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
      return false
    }

    console.log("[v0] 🔑 Supabase credentials OK")

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const notificationData = {
      user_id: userEmail,
      title,
      message,
      type,
      is_read: false,
      related_need_id: relatedNeedId,
      related_proposal_id: relatedProposalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("[v0] 📝 Inserting notification data:", notificationData)

    const { data, error } = await supabase.from("notifications").insert(notificationData).select()

    if (error) {
      console.error("[v0] ❌ ERROR creating notification:", error.message, error)
      return false
    }

    console.log("[v0] ✅ Notification created successfully:", data)
    return true
  } catch (error) {
    console.error("[v0] ❌ EXCEPTION creating notification:", error)
    return false
  }
}

export async function sendBidToChat({
  needId,
  professionalEmail,
  requesterEmail,
  bidAmount,
}: {
  needId: string
  professionalEmail: string
  requesterEmail: string
  bidAmount: number
}) {
  const supabase = await createSupabaseServerClient()
  const now = new Date().toISOString()

  const { data: existingProposals } = await supabase
    .from("need_proposals")
    .select("*")
    .eq("need_id", needId)
    .eq("professional_email", professionalEmail)
    .eq("status", "pending")

  if (existingProposals && existingProposals.length > 0) {
    // Update existing proposals to cancelled
    await supabase
      .from("need_proposals")
      .update({ status: "declined_by_professional" })
      .eq("need_id", needId)
      .eq("professional_email", professionalEmail)
      .eq("status", "pending")
  }

  const { data: newProposal, error: proposalError } = await supabase
    .from("need_proposals")
    .insert({
      need_id: needId,
      professional_email: professionalEmail,
      type: "direct_acceptance",
      status: "pending",
      bid_amount: bidAmount,
      created_at: now,
    })
    .select()
    .single()

  if (proposalError) {
    throw new Error(`Falha ao criar proposta: ${proposalError.message}`)
  }

  // Get or create chat thread
  let chatThread = await getChatThread(needId, requesterEmail, professionalEmail)

  if (!chatThread) {
    // Create new thread with initial interest message
    chatThread = await startChat({
      needId,
      requesterEmail,
      professionalEmail,
      customText: "Olá! Tenho interesse em realizar este serviço.",
    })
  }

  // Get current messages
  const currentMessages: ChatMessage[] = chatThread.messages || []

  // Cancel any previous bid messages from this professional
  const updatedMessages = currentMessages.map((msg) => {
    if (msg.type === "bid" && msg.email === professionalEmail && msg.metadata?.status === "pending") {
      return {
        ...msg,
        metadata: {
          ...msg.metadata,
          status: "cancelled",
        },
      }
    }
    return msg
  })

  const bidMessage: ChatMessage = {
    id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string,
    email: professionalEmail,
    text: `Enviou um lance de R$ ${bidAmount.toFixed(2)}`,
    createdAt: now,
    type: "bid",
    metadata: {
      proposalId: newProposal.id,
      bidAmount: bidAmount,
      status: "pending",
    },
  }

  // Add new bid message
  const finalMessages = [...updatedMessages, bidMessage]

  // Update thread with new messages
  const { error } = await supabase
    .from("chat_threads")
    .update({
      messages_json: finalMessages,
      updated_at: now,
    })
    .eq("id", chatThread.id)

  if (error) {
    throw new Error(`Falha ao enviar lance: ${error.message}`)
  }

  const { data: needData } = await supabase.from("needs").select("title").eq("id", needId).single()

  if (needData) {
    await createNotification(
      requesterEmail,
      "Novo lance recebido",
      `Você recebeu um lance de R$ ${bidAmount.toFixed(2)} para "${needData.title}"`,
      "proposal",
      needId,
      newProposal.id,
    )
  }

  return chatThread.id
}

export type { NewNeedInput, Need, NeedStatus, NeedProposal, ProposalStatus, ProposalType, ChatThread }

export interface Bid {
  id: string
  needId: string
  professionalEmail: string
  professionalName: string
  professionalImage: string | null
  professionalRating?: number
  bidAmount: number
  message: string
  status: "pending" | "accepted" | "declined"
  type: "interest" | "bid"
  whenIso?: string
  declineReason?: string | null
  createdAt: string
  acceptedAt?: string
}

// Helper function to fetch user profile including rating
const getUserProfile = async (email: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[v0] Supabase credentials missing in getUserProfile")
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await supabase
    .from("users")
    .select("full_name, profile_image_url, rating")
    .eq("email", email)
    .single()

  if (error) {
    console.error(`Error fetching user profile for ${email}:`, error)
    return null
  }

  if (data) {
    return {
      fullName: data.full_name,
      photoUrl: data.profile_image_url,
      rating: data.rating,
    }
  }

  return null
}

// Function to fetch proposals with professional profiles
export async function fetchProposalsWithProfiles(needId: string): Promise<Bid[]> {
  const supabase = await createSupabaseServerClient()
  const { data: proposalsData, error: proposalsError } = await supabase
    .from("need_proposals")
    .select("*")
    .eq("need_id", needId)
    .order("created_at", { ascending: false })

  if (proposalsError) throw proposalsError
  console.log("[v0] Fetched proposals:", proposalsData)

  const professionalEmails = Array.from(new Set(proposalsData.map((p) => p.professional_email).filter(Boolean)))
  console.log("[v0] Professional emails to fetch:", professionalEmails)
  const profiles: Record<string, { fullName: string; photoUrl?: string; rating?: number }> = {}

  await Promise.all(
    professionalEmails.map(async (email) => {
      try {
        console.log("[v0] Fetching profile for:", email)
        const profile = await getUserProfile(email)
        console.log("[v0] Got profile:", email, profile)
        if (profile) {
          profiles[email] = {
            fullName: profile.fullName || email.split("@")[0],
            photoUrl: profile.photoUrl,
            rating: profile.rating || 0,
          }
        }
      } catch (error) {
        console.error(`Error fetching profile for ${email}:`, error)
        profiles[email] = {
          fullName: email.split("@")[0],
          rating: 0,
        }
      }
    }),
  )

  console.log("[v0] All profiles fetched:", profiles)

  return proposalsData.map((proposal) => ({
    id: proposal.id,
    needId: proposal.need_id,
    professionalEmail: proposal.professional_email,
    professionalName: profiles[proposal.professional_email]?.fullName || proposal.professional_email.split("@")[0],
    professionalImage: profiles[proposal.professional_email]?.photoUrl || null,
    professionalRating: profiles[proposal.professional_email]?.rating,
    bidAmount: proposal.bid_amount,
    message: proposal.message || "",
    status: proposal.status,
    type: proposal.type,
    whenIso: proposal.when_iso,
    declineReason: null,
    createdAt: proposal.created_at,
    acceptedAt: proposal.accepted_at,
  }))
}
