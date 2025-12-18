"use server" // Marca todas as funções neste arquivo como Server Actions

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
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
}: {
  q?: string
  cidade?: string
  categoria?: string
  status?: string
  requesterEmail?: string
  professionalEmail?: string
  limit?: number
  offset?: number
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
      .select("messages_json, requester_email, professional_email, need_id")
      .eq("id", params.chatThreadId)
      .single()

    if (fetchError || !currentThread) {
      throw new Error("Thread de chat não encontrada ou erro ao buscar.")
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
        .update({ status: "declined_by_professional" })
        .eq("id", params.proposalId)

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

    const { error: updateProposalError } = await supabase
      .from("need_proposals")
      .update({ status: "declined_by_professional" })
      .eq("id", proposalData.id)

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

async function createNotification(
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
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
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
