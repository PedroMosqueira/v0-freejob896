// This file defines the types and initial seed data for the needs store.

export type NeedStatus = "aberto" | "visita-proposta" | "aceito" | "concluido" | "cancelado"

// Novo tipo para propostas de profissionais
export type ProposalType = "visit_proposal" | "direct_acceptance" | "interest_only"
export type ProposalStatus =
  | "pending"
  | "accepted_by_requester"
  | "declined_by_requester"
  | "interested"
  | "accepted_by_professional"
  | "declined_by_professional"
  | "cancelled" // Added cancelled status for bids replaced by newer bids

export type NeedProposal = {
  id: string
  needId: string // ID do serviço ao qual a proposta se refere
  professionalEmail: string
  type: ProposalType
  message?: string
  whenISO?: string // ISO string date for the proposed visit time (only for visit_proposal)
  status: ProposalStatus // Status da proposta (pendente, aceita pelo solicitante, recusada pelo solicitante)
  createdAt: string // ISO string date
  acceptedAt?: string // ISO string date when requester accepted this specific proposal
  bidAmount?: number // Valor do lance do profissional (em BRL)
  platformFee?: number // Taxa da plataforma (10% do lance)
  totalAmount?: number // Valor total que o solicitante pagará (lance + taxa)
}

export type ChatMessageType = "user" | "system" | "bid"

export type ChatMessage = {
  id: string
  email?: string // Present if type is 'user'
  text: string
  createdAt: string // ISO string date
  type: ChatMessageType
  metadata?: {
    bidAmount?: number
    platformFee?: number
    totalAmount?: number
    proposalId?: string
    status?: "pending" | "accepted" | "declined" | "cancelled"
  }
}

// NOVO TIPO: Representa um thread de chat individual
export type ChatThread = {
  id: string // ID do thread de chat
  needId: string
  requesterEmail: string
  professionalEmail: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  lastReadByRequester?: string // ISO string date when requester last read the chat
  lastReadByProfessional?: string // ISO string date when professional last read the chat
}

export type Need = {
  id: string
  title: string
  description?: string
  category: string
  city: string
  neighborhood?: string
  state?: string
  latitude?: number
  longitude?: number
  requesterEmail: string
  status: NeedStatus
  createdAt: string
  proposals: NeedProposal[]
  images?: string[]
}

export type NewNeedInput = Omit<Need, "id" | "status" | "createdAt" | "proposals">
