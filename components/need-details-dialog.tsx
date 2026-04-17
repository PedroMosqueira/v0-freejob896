"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  MessageSquare,
  User,
  Star,
  ThumbsUp,
  ThumbsDown,
  Ban,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import {
  updateNeedStatus,
  cancelNeed,
  acceptProposal,
  professionalRespondToVisit,
  professionalCancelService,
  type Need,
  type NeedStatus,
  type NeedProposal,
  addNeedProposal,
  startChat,
  type ProposalType,
} from "@/lib/needs-store"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { canUserRate } from "@/lib/ratings"
import { Textarea } from "@/components/ui/textarea"
import ChatManagementDialog from "@/components/chat-management-dialog"
import ChatDialog from "@/components/chat-dialog"
import ImageViewerDialog from "@/components/image-viewer-dialog"
import InterestDialog from "@/components/interest-dialog"
import EditNeedDialog from "@/components/edit-need-dialog"
import { formatDistance } from "@/lib/calculate-distance"
import RatingDialog from "@/components/rating-dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { formatCurrency } from "@/lib/pricing"
import SendBidDialog from "@/components/send-bid-dialog"
import { createNotificationViaAPI } from "@/lib/notifications-client"
import { ProfessionalDataModal } from "@/components/professional-data-modal"

// Assuming getUserProfile is defined elsewhere and fetches user details
// import { getUserProfile } from "@/lib/user-profiles"; // Placeholder

// Mock getUserProfile for now if it's not provided
const getUserProfile = async (email: string) => {
  const supabase = createSupabaseBrowserClient()

  // Fetch from 'users' table directly
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

interface NeedDetailsDialogProps {
  need: Need
  isOpen: boolean
  onClose: () => void
  onStatusUpdate?: () => void
}

export default function NeedDetailsDialog({ need, isOpen, onClose, onStatusUpdate }: NeedDetailsDialogProps) {
  const { email } = useAuth()
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [hasMarkedAsCompleted, setHasMarkedAsCompleted] = useState(false)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [showProfessionalCancelConfirmation, setShowProfessionalCancelConfirmation] = useState(false)
  const [professionalCancelReason, setProfessionalCancelReason] = useState("")
  const [isCancelingByProfessional, setIsCancelingByProfessional] = useState(false)
  const [proposals, setProposals] = useState<NeedProposal[]>([])
  const [isLoadingProposals, setIsLoadingProposals] = useState(false)
  const [acceptingProposalId, setAcceptingProposalId] = useState<string | null>(null)
  const [showRatingDialog, setShowRatingDialog] = useState(false)
  const [showProfessionalDataModal, setShowProfessionalDataModal] = useState(false)
  const [isSendingInterest, setIsSendingInterest] = useState(false)
  const [selectedProfessionalChat, setSelectedProfessionalChat] = useState<{
    email: string
    chatThreadId: string
  } | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [requesterProfile, setRequesterProfile] = useState<{
    name: string | null
    profileImageUrl: string | null
  } | null>(null)
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false)
  const [currentNeed, setCurrentNeed] = useState<Need | null>(need || null)
  const [professionalProfiles, setProfessionalProfiles] = useState<
    Record<string, { fullName: string; photoUrl?: string; rating?: number }>
  >({}) // Added rating here

  useEffect(() => {
    setCurrentNeed(need)
  }, [need])

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : (currentNeed.images?.length || 1) - 1))
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < (currentNeed.images?.length || 1) - 1 ? prev + 1 : 0))
  }

  useEffect(() => {
    if (!currentNeed) return
    if (isOpen) {
      setCurrentImageIndex(0)
      fetchProposals()
      fetchRequesterProfile()
      setHasMarkedAsCompleted(false)
    }
    if (isOpen && currentNeed.status === "concluido" && email === currentNeed.requesterEmail) {
      checkCanRate()
    }
  }, [isOpen, currentNeed?.id, email, currentNeed?.status, currentNeed?.requesterEmail])

  useEffect(() => {
    if (!isOpen || !currentNeed) return

    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel(`need_and_proposals_${currentNeed.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "need_proposals",
          filter: `need_id=eq.${currentNeed.id}`,
        },
        (payload) => {
          console.log("[v0] Proposal updated via Realtime:", payload)
          fetchProposals()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "needs",
          filter: `id=eq.${currentNeed.id}`,
        },
        (payload) => {
          console.log("[v0] Need updated via Realtime:", payload)
          // Update currentNeed state with new data
          if (payload.new) {
            setCurrentNeed((prev) => ({
              ...prev,
              ...(payload.new as any),
            }))
            // Notify parent component
            onStatusUpdate?.()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, currentNeed?.id, onStatusUpdate])

  const fetchProposals = async () => {
    if (!currentNeed) {
      console.warn("[v0] fetchProposals called but currentNeed is null")
      return
    }
    setIsLoadingProposals(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from("need_proposals")
        .select("*")
        .eq("need_id", currentNeed.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      console.log("[v0] Fetched proposals:", data)
      setProposals(data || [])

      if (data && data.length > 0) {
        const professionalEmails = Array.from(new Set(data.map((p) => p.professional_email).filter(Boolean)))
        console.log("[v0] Professional emails to fetch:", professionalEmails) // Debug log
        const profiles: Record<string, { fullName: string; photoUrl?: string; rating?: number }> = {} // Added rating here

        await Promise.all(
          professionalEmails.map(async (email) => {
            try {
              console.log("[v0] Fetching profile for:", email) // Debug log
              const profile = await getUserProfile(email)
              console.log("[v0] Got profile:", email, profile) // Debug log
              if (profile) {
                profiles[email] = {
                  fullName: profile.fullName || email.split("@")[0],
                  photoUrl: profile.photoUrl,
                  rating: profile.rating, // Add rating
                }
              }
            } catch (error) {
              console.error(`Error fetching profile for ${email}:`, error)
              profiles[email] = {
                fullName: email.split("@")[0],
              }
            }
          }),
        )

        console.log("[v0] All profiles fetched:", profiles) // Debug log
        setProfessionalProfiles(profiles)
      }
    } catch (error) {
      console.error("Erro ao buscar propostas:", error)
    } finally {
      setIsLoadingProposals(false)
    }
  }

  const fetchRequesterProfile = async () => {
    if (!currentNeed) {
      console.warn("[v0] fetchRequesterProfile called but currentNeed is null")
      return
    }
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from("user_profiles")
        .select("name, profileImageUrl")
        .eq("email", currentNeed.requesterEmail)
        .single()

      if (error) {
        console.error("[v0] Error fetching requester profile:", error)
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("full_name, profile_image_url")
          .eq("email", currentNeed.requesterEmail)
          .single()

        if (userError) {
          console.error("[v0] Error fetching from users table:", userError)
          return
        }

        setRequesterProfile({
          name: userData?.full_name || null,
          profileImageUrl: userData?.profile_image_url || null,
        })
        return
      }

      setRequesterProfile(data)
    } catch (error) {
      console.error("[v0] Error fetching requester profile:", error)
    }
  }

  const handleAcceptProposal = async (proposalId: string) => {
    if (!email) return

    setAcceptingProposalId(proposalId)
    try {
      await acceptProposal(proposalId, currentNeed.id, email)

      const proposal = proposals.find((p) => p.id === proposalId)
      if (proposal?.professional_email) {
        await createNotificationViaAPI({
          userEmail: proposal.professional_email,
          title: "Proposta aceita!",
          message: `Sua proposta para "${currentNeed.title}" foi aceita`,
          type: "proposal_accepted",
          needId: currentNeed.id,
        }).catch((err) => console.error("[v0] Failed to create acceptance notification:", err))
      }

      await fetchProposals()
      onStatusUpdate?.()
      
      // Plataforma gratuita no primeiro ano - sem cobranca de pagamento
      alert("Proposta aceita com sucesso! Entre em contato com o profissional para combinar os detalhes.")
    } catch (error) {
      console.error("Erro ao aceitar proposta:", error)
      alert("Erro ao aceitar proposta. Tente novamente.")
    } finally {
      setAcceptingProposalId(null)
    }
  }

  const getStatusBadgeClass = (s: NeedStatus) => {
    switch (s) {
      case "aberto":
        return "bg-green-500 text-white"
      case "visita-proposta":
        return "bg-yellow-500 text-white"
      case "aceito":
        return "bg-blue-500 text-white"
      case "concluido":
        return "bg-purple-500 text-white"
      case "cancelado":
        return "bg-red-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const handleMarkAsCompleted = async () => {
    if (!email) return

    setHasMarkedAsCompleted(true)
    setIsUpdatingStatus(true)
    try {
      await updateNeedStatus(currentNeed.id, "concluido", email)
      setShowConfirmation(false)
      onStatusUpdate?.()
      await fetchProposals()

      const supabase = createSupabaseBrowserClient()
      const { data: freshProposals } = await supabase.from("need_proposals").select("*").eq("need_id", currentNeed.id)

      console.log("[v0] Fresh proposals after completion:", freshProposals) // Added debug log

      const acceptedProposal = freshProposals?.find(
        (p) => p.status === "accepted_by_requester" || p.status === "accepted_by_professional",
      )

      console.log("[v0] Accepted proposal for rating:", acceptedProposal)
      console.log("[v0] Professional email from proposal:", acceptedProposal?.professional_email)
      console.log("[v0] All fields in accepted proposal:", JSON.stringify(acceptedProposal, null, 2)) // Added detailed log

      if (acceptedProposal?.professional_email) {
        const canRate = await canUserRate(acceptedProposal.professional_email, currentNeed.id)
        console.log("[v0] Can rate result:", canRate)
        if (canRate.canRate) {
          setProfessionalToRate(acceptedProposal.professional_email)
          setShowRatingDialog(true)
        } else {
          console.log("[v0] Cannot rate:", canRate.reason)
        }
      } else {
        console.error("[v0] No professional email found in accepted proposal")
        console.error("[v0] Proposal object keys:", acceptedProposal ? Object.keys(acceptedProposal) : "no proposal") // Log available keys
      }
    } catch (error) {
      console.error("Erro ao marcar como concluído:", error)
      alert("Erro ao marcar serviço como concluído. Tente novamente.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleCancelService = async () => {
    if (!email) return

    setIsUpdatingStatus(true)
    try {
      await cancelNeed(currentNeed.id, email)
      setShowCancelConfirmation(false)
      onStatusUpdate?.()
      onClose()
    } catch (error) {
      console.error("Erro ao cancelar serviço:", error)
      alert(`Erro ao cancelar serviço: ${error instanceof Error ? error.message : "Tente novamente."}`)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const checkCanRate = async () => {
    const acceptedProposal = proposals.find(
      (p) => p.status === "accepted_by_requester" || p.status === "accepted_by_professional",
    )
    if (!acceptedProposal) {
      setCanRateProfessional(false)
      return
    }

    setIsCheckingRating(true)
    try {
      const result = await canUserRate(acceptedProposal.professional_email, currentNeed.id)
      setCanRateProfessional(result.canRate)
    } catch (error) {
      console.error("Erro ao verificar se pode avaliar:", error)
      setCanRateProfessional(false)
    } finally {
      setIsCheckingRating(false)
    }
  }

  const handleProfessionalVisitResponse = async (accepted: boolean) => {
    if (!email) return

    const professionalProposal = proposals.find(
      (p) => p.professional_email === email && p.status === "accepted_by_requester" && p.type === "visit_proposal",
    )

    if (!professionalProposal) return

    setIsRespondingToVisit(true)
    try {
      await professionalRespondToVisit({
        proposalId: professionalProposal.id,
        needId: currentNeed.id,
        professionalEmail: email,
        accepted,
        message: visitResponseMessage || undefined,
        // Pass bid amount if accepting
        bidAmount: accepted ? Number(visitBidAmount) : undefined,
      })

      setShowVisitResponse(false)
      setVisitResponseMessage("")
      setVisitResponseType(null)
      setVisitBidAmount("")
      await fetchProposals()
      onStatusUpdate?.()
    } catch (error) {
      console.error("Erro ao responder à visita:", error)
      alert(`Erro ao responder à visita: ${error instanceof Error ? error.message : "Tente novamente."}`)
    } finally {
      setIsRespondingToVisit(false)
    }
  }

  const handleProfessionalCancelService = async () => {
    if (!email) return

    setIsCancelingByProfessional(true)
    try {
      await professionalCancelService({
        needId: currentNeed.id,
        professionalEmail: email,
        reason: professionalCancelReason || undefined,
      })

      setShowProfessionalCancelConfirmation(false)
      setProfessionalCancelReason("")
      onStatusUpdate?.()
      onClose()
    } catch (error) {
      console.error("Erro ao cancelar serviço:", error)
      alert(`Erro ao cancelar serviço: ${error instanceof Error ? error.message : "Tente novamente."}`)
    } finally {
      setIsCancelingByProfessional(false)
    }
  }

  const handleOpenChatWithProfessional = async (professionalEmail: string) => {
    try {
      const supabase = createSupabaseBrowserClient()

      // Check if chat thread already exists
      const { data: existingThread, error: fetchError } = await supabase
        .from("chat_threads")
        .select("*")
        .eq("need_id", currentNeed.id)
        .eq("professional_email", professionalEmail)
        .eq("requester_email", currentNeed.requesterEmail)
        .maybeSingle()

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError
      }

      let chatThreadId: string

      if (existingThread) {
        chatThreadId = existingThread.id
      } else {
        // Create new chat thread with correct column structure
        const { data: newThread, error: createError } = await supabase
          .from("chat_threads")
          .insert({
            need_id: currentNeed.id,
            professional_email: professionalEmail,
            requester_email: currentNeed.requesterEmail,
            messages_json: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (createError) throw createError
        chatThreadId = newThread.id
      }

      setSelectedProfessionalChat({
        email: professionalEmail,
        chatThreadId,
      })
    } catch (error) {
      console.error("Erro ao abrir chat com profissional:", error)
      alert("Erro ao abrir chat. Tente novamente.")
    }
  }

  if (!currentNeed) {
    return null
  }

  // Derived variables that depend on email and currentNeed
  const acceptedProposal = proposals.find(
    (p) => p.status === "accepted_by_requester" || p.status === "accepted_by_professional",
  )

  const professionalAcceptedVisitProposal = proposals.find(
    (p) => p.type === "visit_proposal" && p.status === "accepted_by_professional" && p.professional_email !== email,
  )

  const professionalAcceptedProposal = proposals.find(
    (p) =>
      p.professional_email === email &&
      (p.status === "accepted_by_requester" || p.status === "accepted_by_professional"),
  )
  const canProfessionalCancel =
    !!professionalAcceptedProposal && currentNeed.status !== "concluido" && currentNeed.status !== "cancelado"

  const professionalVisitProposal = proposals.find(
    (p) => p.professional_email === email && p.status === "accepted_by_requester" && p.type === "visit_proposal",
  )
  const canRespondToVisit = !!professionalVisitProposal && currentNeed.status === "aceito"

  const hasShownInterest = proposals.some((p) => p.professional_email === email && p.type === "interest_only")

  const canMarkAsCompleted =
    email === currentNeed.requesterEmail &&
    currentNeed.status === "aceito" &&
    !!acceptedProposal &&
    !professionalAcceptedVisitProposal &&
    !hasMarkedAsCompleted

  const canMarkAsCompletedRevised =
    email === currentNeed.requesterEmail &&
    currentNeed.status === "aceito" &&
    !!acceptedProposal &&
    acceptedProposal.status === "accepted_by_requester" &&
    !hasMarkedAsCompleted

  const canCancelService =
    email === currentNeed.requesterEmail && currentNeed.status !== "concluido" && currentNeed.status !== "cancelado"
  const isRequester = email === currentNeed.requesterEmail
  const canRate = email === currentNeed.requesterEmail && currentNeed.status === "concluido" && canRateProfessional

  const handleRateClick = () => {
    console.log("[v0] handleRateClick - acceptedProposal:", acceptedProposal)
    console.log("[v0] handleRateClick - professional_email:", acceptedProposal?.professional_email)

    if (!acceptedProposal) {
      console.error("[v0] No accepted proposal found")
      alert("Erro: Não foi possível encontrar uma proposta aceita.")
      return
    }

    if (!acceptedProposal.professional_email) {
      console.error("[v0] Accepted proposal missing professional email", acceptedProposal)
      alert("Erro: Não foi possível encontrar o profissional para avaliar.")
      return
    }

    console.log("[v0] Opening rating dialog for:", acceptedProposal.professional_email)
    setProfessionalToRate(acceptedProposal.professional_email)
    setShowRatingDialog(true)
  }

  const handleRatingSuccess = () => {
    setShowRatingDialog(false)
    setProfessionalToRate(null)
    onStatusUpdate?.()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[95vw] sm:max-w-[380px] md:max-w-[420px] lg:max-w-[450px] flex flex-col max-h-[90vh] md:max-h-[85vh] lg:max-h-[80vh] p-0 gap-0 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500">
          {currentNeed.images && currentNeed.images.length > 0 && (
            <div className="relative w-full h-[380px] sm:h-[380px] md:h-[420px] lg:h-[450px] bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden">
              <img
                src={currentNeed.images[currentImageIndex] || "/placeholder.svg"}
                alt={`Imagem ${currentImageIndex + 1}`}
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() =>
                  setSelectedImage({
                    url: currentNeed.images![currentImageIndex],
                    alt: `Imagem do serviço ${currentNeed.title} ${currentImageIndex + 1}`,
                  })
                }
              />

              {currentNeed.images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
                    onClick={handlePreviousImage}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
                    onClick={handleNextImage}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>

                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {currentNeed.images.map((_, index) => (
                      <button
                        key={index}
                        className={`h-1.5 rounded-full transition-all ${
                          index === currentImageIndex ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                        aria-label={`Ir para imagem ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="px-6 pt-4">
            <DialogHeader className="pb-3">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl">{currentNeed.title}</DialogTitle>
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 pb-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href={`/profile/${encodeURIComponent(currentNeed.requesterEmail)}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <Avatar className="h-6 w-6">
                    {requesterProfile?.profileImageUrl && (
                      <AvatarImage
                        src={requesterProfile.profileImageUrl || "/placeholder.svg"}
                        alt={requesterProfile.name || "Usuário"}
                      />
                    )}
                    <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      {requesterProfile?.name
                        ? requesterProfile.name.charAt(0).toUpperCase()
                        : currentNeed.requesterEmail.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-gray-700 dark:text-gray-300 font-medium hover:underline">
                    {requesterProfile?.name
                      ? requesterProfile.name.split(" ")[0]
                      : currentNeed.requesterEmail.split("@")[0]}
                  </span>
                </Link>
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(currentNeed.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {currentNeed.category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {currentNeed.city}
                </Badge>
                {currentNeed.distance !== undefined && currentNeed.distance !== Number.POSITIVE_INFINITY && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs"
                  >
                    📍 {formatDistance(currentNeed.distance)}
                  </Badge>
                )}
                <Badge className={`${getStatusBadgeClass(currentNeed.status)} text-xs`}>
                  {currentNeed.status.charAt(0).toUpperCase() + currentNeed.status.slice(1).replace(/-/g, " ")}
                </Badge>
              </div>

              <div className="pt-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {currentNeed.description || "Nenhuma descrição fornecida."}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {email && !isRequester && currentNeed.status === "aberto" && !hasShownInterest && (
                  <Button
                    className="w-full bg-blue-500 text-white hover:bg-blue-600 h-9"
                    size="sm"
                    onClick={async () => {
                      if (!email) return

                      // Verificar se o usuário tem dados profissionais completos
                      const supabase = createSupabaseBrowserClient()
                      const { data: userData, error } = await supabase
                        .from("users")
                        .select("is_professional, cpf, professional_phone")
                        .eq("email", email)
                        .single()

                      if (error || !userData) {
                        alert("Erro ao verificar seus dados.")
                        return
                      }

                      // Se não é profissional ou não tem CPF e telefone, abrir modal
                      if (!userData.is_professional || !userData.cpf || !userData.professional_phone) {
                        setShowProfessionalDataModal(true)
                        return
                      }

                      // Dados completos, prosseguir com interesse
                      setIsSendingInterest(true)
                      try {
                        const thread = await startChat({
                          needId: currentNeed.id,
                          requesterEmail: currentNeed.requesterEmail,
                          professionalEmail: email,
                          customText: "Olá! Tenho interesse em realizar este serviço.",
                        })

                        if (thread) {
                          await addNeedProposal({
                            needId: currentNeed.id,
                            professionalEmail: email,
                            type: "interest_only" as ProposalType,
                          })

                          await fetchProposals()
                          onStatusUpdate?.()
                        }
                      } catch (error) {
                        console.error("Erro ao demonstrar interesse:", error)
                        alert("Erro ao demonstrar interesse. Tente novamente.")
                      } finally {
                        setIsSendingInterest(false)
                      }
                    }}
                    disabled={isSendingInterest}
                  >
                    {isSendingInterest ? "Enviando..." : "Tenho Interesse"}
                  </Button>
                )}

                {email && !isRequester && hasShownInterest && currentNeed.status === "aberto" && (
                  <Button
                    onClick={() => setShowSendBidDialog(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    💰 Enviar Lance
                  </Button>
                )}

                {email && (
                  <Button
                    variant="outline"
                    className="w-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 border-blue-200 dark:border-blue-800 h-9"
                    size="sm"
                    onClick={() => setSelectedNeedForChatManagement(currentNeed)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" /> Abrir Chat
                  </Button>
                )}
              </div>

              {/* Only show "Marcar como Concluído" after requester accepts the final proposal */}
              {isRequester && (
                <div className="pt-3 border-t dark:border-gray-700 space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Propostas Recebidas ({proposals.filter((p) => p.type !== "interest_only").length})
                  </h3>
                  {isLoadingProposals ? (
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Carregando...</p>
                  ) : proposals.filter((p) => p.type !== "interest_only").length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Nenhuma proposta recebida.</p>
                  ) : (
                    <div className="space-y-2">
                      {proposals
                        .filter((p) => p.type !== "interest_only")
                        .map((proposal) => {
                          const professionalName =
                            professionalProfiles[proposal.professional_email]?.fullName ||
                            proposal.professional_email.split("@")[0]
                          const professionalPhoto = professionalProfiles[proposal.professional_email]?.photoUrl
                          const professionalRating = professionalProfiles[proposal.professional_email]?.rating || 0

                          const firstName = professionalName.split(" ")[0]

                          const isProfessionalAcceptedVisit =
                            proposal.type === "visit_proposal" &&
                            proposal.status === "accepted_by_professional" &&
                            proposal.professional_email !== email

                          if (isProfessionalAcceptedVisit && currentNeed.status === "aceito") {
                            return (
                              <div
                                key={proposal.id}
                                className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 space-y-3"
                              >
                                <div className="flex items-center gap-2 text-green-700 dark:text-green-500">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="font-semibold text-sm">
                                    Profissional aceitou fazer o serviço após visita
                                  </span>
                                </div>

                                {proposal.bid_amount && (
                                  <div className="p-3 bg-white dark:bg-gray-800 rounded space-y-2">
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      Resumo de Valores:
                                    </p>
                                    <div className="space-y-1.5 text-xs">
                                      <div className="flex justify-between pb-1.5 border-b border-gray-200 dark:border-gray-600">
                                        <span className="text-gray-600 dark:text-gray-400">Profissional recebe:</span>
                                        <span className="font-semibold text-green-600 dark:text-green-400">
                                          {formatCurrency(proposal.bid_amount)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                        <span>Taxa da plataforma (15%):</span>
                                        <span>{formatCurrency(proposal.bid_amount * 0.15)}</span>
                                      </div>
                                      <div className="flex justify-between font-bold pt-1.5 border-t border-gray-200 dark:border-gray-600">
                                        <span className="text-gray-700 dark:text-gray-300">Você pagará:</span>
                                        <span className="text-blue-600 dark:text-blue-400">
                                          {formatCurrency(proposal.bid_amount * 1.15)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Deseja aceitar esta proposta e iniciar o serviço?
                                </p>

                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleAcceptProposal(proposal.id)}
                                    disabled={acceptingProposalId === proposal.id}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white h-10 text-sm"
                                    size="sm"
                                  >
                                    {acceptingProposalId === proposal.id ? "Aceitando..." : "Aceitar Proposta"}
                                  </Button>
                                  <Button
                                    onClick={async () => {
                                      try {
                                        const supabase = createSupabaseBrowserClient()
                                        await supabase
                                          .from("need_proposals")
                                          .update({ status: "declined_by_requester" })
                                          .eq("id", proposal.id)

                                        await fetchProposals()
                                        onStatusUpdate?.()
                                      } catch (error) {
                                        console.error("Erro ao recusar proposta:", error)
                                        alert("Erro ao recusar proposta. Tente novamente.")
                                      }
                                    }}
                                    variant="outline"
                                    className="flex-1 border-red-500 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 h-10 text-sm"
                                    size="sm"
                                  >
                                    Recusar Proposta
                                  </Button>
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div
                              key={proposal.id}
                              className="border dark:border-gray-700 rounded p-2.5 bg-white dark:bg-gray-800 space-y-1.5 shadow-sm"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={professionalPhoto || "/placeholder.svg"} />
                                    <AvatarFallback>
                                      <User className="h-4 w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-xs truncate">{firstName}</span>
                                    {professionalRating > 0 ? (
                                      <div className="flex items-center gap-1 text-xs">
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                          {professionalRating.toFixed(1)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground dark:text-gray-500">
                                        Sem avaliações
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge
                                  variant={
                                    proposal.status === "accepted_by_requester"
                                      ? "secondary"
                                      : proposal.status === "accepted_by_professional"
                                        ? "default"
                                        : proposal.status === "declined_by_professional" ||
                                            proposal.status === "declined_by_requester"
                                          ? "destructive"
                                          : proposal.status === "cancelled"
                                            ? "outline"
                                            : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {proposal.status === "accepted_by_requester" && proposal.type === "visit_proposal"
                                    ? "Aguardando visita"
                                    : proposal.status === "accepted_by_professional"
                                      ? "Aceita pelo profissional"
                                      : proposal.status === "declined_by_professional" ||
                                          proposal.status === "declined_by_requester"
                                        ? "Recusada"
                                        : proposal.status === "cancelled"
                                          ? "Cancelada"
                                          : proposal.status === "accepted_by_requester"
                                            ? "Aceita"
                                            : "Pendente"}
                                </Badge>
                              </div>

                              {proposal.bid_amount && (
                                <div className="space-y-1.5 text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>Profissional recebe:</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                      {formatCurrency(proposal.bid_amount)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-gray-500 dark:text-gray-400 text-[10px]">
                                    <span>Taxa (15%):</span>
                                    <span>{formatCurrency(proposal.bid_amount * 0.15)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span className="text-gray-700 dark:text-gray-300">Você paga:</span>
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {formatCurrency(proposal.bid_amount * 1.15)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {proposal.message && (
                                <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded text-xs italic">
                                  {proposal.message}
                                </div>
                              )}

                              {proposal.status !== "accepted_by_requester" &&
                                proposal.status !== "declined_by_professional" &&
                                proposal.status !== "declined_by_requester" &&
                                currentNeed.status === "aberto" && (
                                  <div className="flex gap-1.5 pt-1">
                                    <Button
                                      onClick={() => handleAcceptProposal(proposal.id)}
                                      disabled={acceptingProposalId === proposal.id}
                                      className="flex-1 bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                                      size="sm"
                                    >
                                      {acceptingProposalId === proposal.id ? "Aceitando..." : "Aceitar"}
                                    </Button>
                                    <Button
                                      onClick={async () => {
                                        try {
                                          const supabase = createSupabaseBrowserClient()
                                          await supabase
                                            .from("need_proposals")
                                            .update({ status: "declined_by_requester" })
                                            .eq("id", proposal.id)

                                          await fetchProposals()
                                          onStatusUpdate?.()
                                        } catch (error) {
                                          console.error("Erro ao recusar proposta:", error)
                                          alert("Erro ao recusar proposta. Tente novamente.")
                                        }
                                      }}
                                      variant="outline"
                                      className="flex-1 border-red-500 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 h-8 text-xs"
                                      size="sm"
                                    >
                                      Recusar
                                    </Button>
                                  </div>
                                )}
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )}

              {canRespondToVisit && (
                <div className="p-3 border-t dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
                  {!showVisitResponse ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-semibold text-sm">Responder após visita</span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        Após avaliar o serviço no local, você pode aceitar ou recusar a execução.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setVisitResponseType("accept")
                            setShowVisitResponse(true)
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9 text-sm"
                          size="sm"
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Aceitar Serviço
                        </Button>
                        <Button
                          onClick={() => {
                            setVisitResponseType("decline")
                            setShowVisitResponse(true)
                          }}
                          variant="outline"
                          className="flex-1 border-red-500 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 h-9 text-sm"
                          size="sm"
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          Recusar Serviço
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {visitResponseType === "accept"
                          ? "Confirmar que vai executar o serviço?"
                          : "Confirmar que não vai executar o serviço?"}
                      </p>

                      {visitResponseType === "accept" && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Valor do lance (mínimo R$ 50,00):
                          </label>
                          <input
                            type="number"
                            min="50"
                            step="0.01"
                            placeholder="Ex: 150.00"
                            value={visitBidAmount}
                            onChange={(e) => setVisitBidAmount(e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                          />
                          {visitBidAmount && Number(visitBidAmount) >= 50 && (
                            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Seu lance:</span>
                                <span>{formatCurrency(Number(visitBidAmount))}</span>
                              </div>
                              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Taxa (15%):</span>
                                <span>{formatCurrency(Number(visitBidAmount) * 0.15)}</span>
                              </div>
                              <div className="flex justify-between font-semibold border-t border-blue-200 dark:border-blue-800 pt-1">
                                <span>Cliente pagará:</span>
                                <span className="text-blue-600 dark:text-blue-400">
                                  {formatCurrency(Number(visitBidAmount) * 1.15)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <Textarea
                        placeholder={
                          visitResponseType === "accept"
                            ? "Mensagem opcional: ex. 'Serviço avaliado, posso executar conforme combinado.'"
                            : "Motivo da recusa (opcional)"
                        }
                        value={visitResponseMessage}
                        onChange={(e) => setVisitResponseMessage(e.target.value)}
                        rows={2}
                        className="text-xs dark:bg-gray-800 dark:border-gray-600"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleProfessionalVisitResponse(visitResponseType === "accept")}
                          disabled={
                            isRespondingToVisit ||
                            (visitResponseType === "accept" && (!visitBidAmount || Number(visitBidAmount) < 50))
                          }
                          className={
                            visitResponseType === "accept"
                              ? "flex-1 bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                              : "flex-1 bg-red-600 hover:bg-red-700 text-white h-8 text-xs"
                          }
                          size="sm"
                        >
                          {isRespondingToVisit ? "Enviando..." : "Confirmar"}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowVisitResponse(false)
                            setVisitResponseMessage("")
                            setVisitResponseType(null)
                            setVisitBidAmount("")
                          }}
                          variant="outline"
                          className="flex-1 h-8 text-xs dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          size="sm"
                        >
                          Voltar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {canMarkAsCompletedRevised && ( // Use the revised logic for canMarkAsCompleted
                <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  {!showConfirmation ? (
                    <Button
                      onClick={() => setShowConfirmation(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white h-9"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Concluído
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Confirmar conclusão do serviço?</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleMarkAsCompleted}
                          disabled={isUpdatingStatus}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                          size="sm"
                        >
                          {isUpdatingStatus ? "Confirmando..." : "Sim"}
                        </Button>
                        <Button
                          onClick={() => setShowConfirmation(false)}
                          variant="outline"
                          className="flex-1 h-8 text-xs dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          size="sm"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {canRate && acceptedProposal && (
                <div className="p-3 border-t dark:border-gray-700 bg-blue-50 dark:bg-gray-900/50">
                  <Button
                    onClick={handleRateClick}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-9"
                    size="sm"
                  >
                    <Star className="h-4 w-4 mr-2 fill-current" />
                    Avaliar Profissional
                  </Button>
                </div>
              )}

              {canProfessionalCancel && (
                <div className="p-3 border-t dark:border-gray-700 bg-orange-50 dark:bg-gray-900/50">
                  {!showProfessionalCancelConfirmation ? (
                    <Button
                      onClick={() => setShowProfessionalCancelConfirmation(true)}
                      variant="outline"
                      className="w-full border-orange-500 text-orange-600 hover:bg-orange-50 h-9"
                      size="sm"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancelar Serviço
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Informe o motivo do cancelamento:</p>
                      <Textarea
                        placeholder="Motivo do cancelamento"
                        value={professionalCancelReason}
                        onChange={(e) => setProfessionalCancelReason(e.target.value)}
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleProfessionalCancelService}
                          disabled={isCancelingByProfessional}
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white h-8 text-xs"
                          size="sm"
                        >
                          {isCancelingByProfessional ? "Cancelando..." : "Confirmar"}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowProfessionalCancelConfirmation(false)
                            setProfessionalCancelReason("")
                          }}
                          variant="outline"
                          className="flex-1 h-8 text-xs dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          size="sm"
                        >
                          Voltar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {canCancelService && (
                <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  {!showCancelConfirmation ? (
                    <Button
                      onClick={() => setShowCancelConfirmation(true)}
                      variant="destructive"
                      className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white border-0 h-9 shadow-sm"
                      size="sm"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar Serviço
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Confirmar cancelamento do serviço?</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCancelService}
                          disabled={isUpdatingStatus}
                          className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white h-8 text-xs"
                          size="sm"
                        >
                          {isUpdatingStatus ? "Cancelando..." : "Sim"}
                        </Button>
                        <Button
                          onClick={() => setShowCancelConfirmation(false)}
                          variant="outline"
                          className="flex-1 h-8 text-xs dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                          size="sm"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedNeedForChatManagement && email && (
        <ChatManagementDialog
          need={selectedNeedForChatManagement}
          isOpen={!!selectedNeedForChatManagement}
          onClose={() => setSelectedNeedForChatManagement(null)}
          currentUserEmail={email}
          onActionSuccess={() => {
            // Fixed prop name from onActionSuccess to onChatActionSuccess
            setSelectedNeedForChatManagement(null)
            onStatusUpdate?.()
          }}
        />
      )}

      {selectedProfessionalChat && email && (
        <ChatDialog
          need={currentNeed}
          isOpen={!!selectedProfessionalChat}
          onClose={() => setSelectedProfessionalChat(null)}
          currentUserEmail={email}
          chatThreadId={selectedProfessionalChat.chatThreadId}
        />
      )}

      {selectedImage && (
        <ImageViewerDialog
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage.url}
          imageAlt={selectedImage.alt}
        />
      )}

      {showInterestDialog && email && (
        <InterestDialog
          need={currentNeed}
          isOpen={showInterestDialog}
          onClose={() => setShowInterestDialog(false)}
          currentUserEmail={email}
          onActionSuccess={() => {
            setShowInterestDialog(false)
            fetchProposals()
            onStatusUpdate?.()
          }}
        />
      )}

      {showProfessionalDataModal && email && (
        <ProfessionalDataModal
          isOpen={showProfessionalDataModal}
          onClose={() => setShowProfessionalDataModal(false)}
          userEmail={email}
          onComplete={() => {
            setShowProfessionalDataModal(false)
            // Agora pode clicar em tenho interesse
          }}
        />
      )}

      {showSendBidDialog && email && (
        <SendBidDialog
          need={currentNeed}
          isOpen={showSendBidDialog}
          onClose={() => setShowSendBidDialog(false)}
          currentUserEmail={email}
          onSuccess={() => {
            setShowSendBidDialog(false)
            fetchProposals()
            onStatusUpdate?.()
          }}
        />
      )}

      {showEditDialog && (
        <EditNeedDialog
          need={currentNeed}
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            fetchProposals()
            onStatusUpdate?.()
          }}
        />
      )}

      {showRatingDialog && professionalToRate && (
        <RatingDialog
          isOpen={showRatingDialog}
          onClose={() => {
            setShowRatingDialog(false)
            setProfessionalToRate(null)
          }}
          professionalEmail={professionalToRate}
          requesterEmail={email || ""}
          needId={currentNeed.id}
          onSuccess={handleRatingSuccess}
        />
      )}
    </>
  )
}

export { NeedDetailsDialog }
