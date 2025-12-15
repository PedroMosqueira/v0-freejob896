"use client"

import React from "react"
import { CategoryCombobox } from "@/components/category-combobox"
import type { ReactElement } from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { filterNeeds, getNeed, type Need, type NeedStatus } from "@/lib/needs-store"
import { useAuth } from "@/hooks/use-auth"
import ChatManagementDialog from "@/components/chat-management-dialog"
import NeedDetailsDialog from "@/components/need-details-dialog"
import InterestDialog from "@/components/interest-dialog"
import { calculateDistance, formatDistance } from "@/lib/calculate-distance"
import { CourseBannerAd } from "@/components/course-banner-ad"
import { GoogleAdSense } from "@/components/google-adsense"
import { AffiliateSidebar, AffiliateSidebarVertical } from "@/components/affiliate-sidebar"
import { AdWrapper } from "@/components/ad-wrapper"

interface SearchRequestsProps {
  initialShowMyRequests?: boolean
  initialShowMyProfessionalServices?: boolean
  showFilters?: boolean
  searchQuery?: string
}

function SearchRequests({
  initialShowMyRequests = false,
  initialShowMyProfessionalServices = false,
  showFilters = false,
  searchQuery = "",
}: SearchRequestsProps): ReactElement {
  const { email, isFreeUser } = useAuth()

  console.log("[v0] isFreeUser:", isFreeUser)
  console.log("[v0] email:", email)

  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [city, setCity] = useState("")
  const [status, setStatus] = useState("all")
  const [showMyRequests, setShowMyRequests] = useState(initialShowMyRequests)
  const [showMyProfessionalServices, setShowMyProfessionalServices] = useState(initialShowMyProfessionalServices)
  const [searchResults, setSearchResults] = useState<Need[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  const [selectedNeedForDetails, setSelectedNeedForDetails] = useState<Need | null>(null)
  const [selectedNeedForInterest, setSelectedNeedForInterest] = useState<Need | null>(null)
  const [selectedNeedForChatManagement, setSelectedNeedForChatManagement] = useState<Need | null>(null)

  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({})

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [userCity, setUserCity] = useState<string>("")

  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null)

  const getTitle = () => {
    if (initialShowMyRequests) return "Minhas Solicitações"
    if (initialShowMyProfessionalServices) return "Meus Serviços (Propostas Aceitas)"
    return "Serviços Disponíveis"
  }

  const performSearch = useCallback(
    async (isLoadMore = false) => {
      if (!isLoadMore) {
        setIsSearching(true)
      } else {
        setIsLoadingMore(true)
      }

      const searchTerm = searchQuery || query
      const currentPage = isLoadMore ? page : 0
      const limit = 20

      try {
        let fetchedNeeds: Need[]

        if (showMyRequests && email) {
          fetchedNeeds = await filterNeeds({
            q: searchTerm,
            cidade: city,
            categoria: category === "all" ? undefined : category,
            status: status === "all" ? undefined : status,
            requesterEmail: email,
            limit,
            offset: currentPage * limit,
          })
        } else if (showMyProfessionalServices && email) {
          fetchedNeeds = await filterNeeds({
            q: searchTerm,
            cidade: city,
            categoria: category === "all" ? undefined : category,
            status: status === "all" ? undefined : status,
            professionalEmail: email,
            limit,
            offset: currentPage * limit,
          })
        } else {
          fetchedNeeds = await filterNeeds({
            q: searchTerm,
            cidade: city,
            categoria: category === "all" ? undefined : category,
            status: status === "all" ? undefined : status,
            limit,
            offset: currentPage * limit,
          })
        }

        if (userLocation) {
          fetchedNeeds = fetchedNeeds
            .map((need) => {
              if (need.latitude && need.longitude) {
                const distance = calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  need.latitude,
                  need.longitude,
                )
                return { ...need, distance }
              }
              return { ...need, distance: Number.POSITIVE_INFINITY }
            })
            .sort((a: any, b: any) => a.distance - b.distance)
        }

        if (isLoadMore) {
          setSearchResults((prev) => [...prev, ...fetchedNeeds])
        } else {
          setSearchResults(fetchedNeeds)
          setPage(0)
        }

        setHasMore(fetchedNeeds.length === limit)
      } catch (error) {
        console.error("Erro ao buscar pedidos:", error)
        if (!isLoadMore) {
          setSearchResults([])
        }
      } finally {
        if (!isLoadMore) {
          setIsSearching(false)
        } else {
          setIsLoadingMore(false)
        }
      }
    },
    [
      query,
      category,
      city,
      status,
      showMyRequests,
      showMyProfessionalServices,
      email,
      userLocation,
      initialShowMyRequests,
      initialShowMyProfessionalServices,
      searchQuery,
      page,
    ],
  )

  useEffect(() => {
    setPage(0)
    setHasMore(true)
    performSearch(false)
  }, [query, category, city, status, searchQuery, userLocation])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isSearching) {
          setPage((prev) => prev + 1)
        }
      },
      { threshold: 0.1 },
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoadingMore, isSearching])

  useEffect(() => {
    if (page > 0) {
      performSearch(true)
    }
  }, [page])

  useEffect(() => {
    if (!userLocation && !isGettingLocation && navigator.geolocation) {
      setIsGettingLocation(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ latitude, longitude })

          try {
            const response = await fetch(`/api/geocode?q=${latitude},${longitude}&reverse=true`)
            const data = await response.json()
            if (data.address) {
              const city = data.address.city || data.address.town || data.address.village || ""
              setUserCity(city)
            }
          } catch (error) {
            console.error("[v0] Error getting user city:", error)
          }

          setIsGettingLocation(false)
        },
        (error) => {
          console.error("[v0] Geolocation error:", error.message, error.code)
          if (error.code === 1) {
            console.error("[v0] User denied location permission")
          } else if (error.code === 2) {
            console.error("[v0] Location unavailable")
          } else if (error.code === 3) {
            console.error("[v0] Location request timeout")
          }
          setIsGettingLocation(false)
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        },
      )
    }
  }, [userLocation, isGettingLocation])

  useEffect(() => {
    if (userLocation && searchResults.length > 0) {
      performSearch(false)
    }
  }, [userLocation])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
    setIsMobileFilterOpen(false)
  }

  const handleActionSuccess = () => {
    performSearch()
    setSelectedNeedForInterest(null)
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

  const normalizeCityName = (city: string | undefined) => {
    if (!city) return ""
    return city
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  }

  const FilterForm = () => (
    <form onSubmit={handleSearch} className="space-y-3 px-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="search-query" className="text-sm font-medium">
            Palavra-chave
          </Label>
          <Input
            id="search-query"
            placeholder="Ex: encanador"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="search-city" className="text-sm font-medium">
            Cidade
          </Label>
          <Input
            id="search-city"
            placeholder="Ex: Rio de Janeiro"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="search-status" className="text-sm font-medium">
            Status
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="search-status" className="text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="visita-proposta">Visita Proposta</SelectItem>
              <SelectItem value="aceito">Aceito</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="search-category" className="text-sm font-medium">
            Categoria
          </Label>
          <CategoryCombobox
            value={category}
            onValueChange={setCategory}
            placeholder="Todas as categorias"
            className="text-sm"
            includeAll={true}
          />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" className="bg-yellow-400 hover:bg-yellow-400/90 text-black gap-2 w-full sm:w-auto">
          <Search className="h-4 w-4" /> Aplicar Filtros
        </Button>
      </div>
    </form>
  )

  useEffect(() => {
    if (showFilters) {
      setIsMobileFilterOpen(true)
    }
  }, [showFilters])

  useEffect(() => {
    const handleOpenNeed = async (event: any) => {
      const needId = event.detail

      if (!needId) {
        console.warn("[v0] SearchRequests: No needId in event")
        return
      }

      try {
        const need = await getNeed(needId)

        if (need) {
          setSelectedNeedForDetails(need)
        } else {
          console.warn("[v0] SearchRequests: No need found with ID:", needId)
        }
      } catch (error) {
        console.error("[v0] SearchRequests: Error opening need:", error)
      }
    }

    window.addEventListener("openNeed", handleOpenNeed)

    return () => {
      window.removeEventListener("openNeed", handleOpenNeed)
    }
  }, [])

  return (
    <>
      <AdWrapper freeUserOnly={isFreeUser}>
        <AffiliateSidebar />
      </AdWrapper>

      <div className="flex gap-6">
        <div className="flex-1 grid gap-4 sm:gap-6">
          <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
            <SheetContent side="left" className="w-[300px] sm:w-[350px]">
              <SheetHeader>
                <SheetTitle>Filtros de Busca</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterForm />
              </div>
            </SheetContent>
          </Sheet>

          {isSearching ? (
            <p className="col-span-full text-center text-gray-600 text-sm sm:text-base">Carregando serviços...</p>
          ) : searchResults.length === 0 ? (
            <p className="col-span-full text-center text-gray-600 text-sm sm:text-base">
              Nenhum pedido encontrado com os filtros aplicados.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {searchResults.map((need: any, index: number) => {
                  const hasProposedInterest = email
                    ? need.proposals.some(
                        (p) =>
                          p.professionalEmail === email &&
                          (p.status === "pending" || p.status === "accepted_by_requester"),
                      )
                    : false

                  const isRequesterOfNeed = email === need.requesterEmail

                  const isInSameCity =
                    userCity && need.neighborhood
                      ? `${need.neighborhood} - ${need.city}`
                      : `${need.city}${need.state ? ` - ${need.state}` : ""}`

                  const displayImage =
                    need.images && need.images.length > 0 ? need.images[0] : getCategoryImage(need.category)

                  return (
                    <React.Fragment key={need.id}>
                      <Card
                        className="group relative overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 ease-out cursor-pointer dark:bg-gray-800 dark:border-gray-700 rounded-none border aspect-square p-[1px]"
                        onClick={() => setSelectedNeedForDetails(need)}
                      >
                        <div className="relative w-full h-full">
                          <img
                            src={displayImage || "/placeholder.svg"}
                            alt={`Imagem do serviço ${need.title}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />

                          {need.distance && need.distance < 999 && (
                            <div className="absolute top-2 right-2 z-30">
                              <span className="text-white font-bold text-xs whitespace-nowrap bg-blue-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-lg border border-blue-400/50">
                                ⚡ {formatDistance(need.distance)}
                              </span>
                            </div>
                          )}

                          <div className="absolute -bottom-px -left-px -right-px h-12 group-hover:h-[33%] bg-gradient-to-t from-gray-900/95 via-gray-800/90 to-transparent dark:from-gray-950/98 dark:via-gray-900/95 backdrop-blur-sm transition-all duration-500 ease-out flex flex-col z-20 p-0">
                            <div className="px-2 pt-2 pb-1.5">
                              <h3 className="font-semibold text-sm text-white line-clamp-1">{need.title}</h3>
                            </div>

                            <div className="px-2 pb-2 flex-1 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-xs mb-1">
                                  <span className="text-gray-300 line-clamp-1 text-[11px]">📍 {isInSameCity}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] ${getStatusBadgeClass(need.status)}`}
                                  >
                                    {need.status}
                                  </span>
                                  {hasProposedInterest && (
                                    <span className="text-green-400 font-semibold text-[10px]">✓ Interesse</span>
                                  )}
                                </div>

                                <p className="text-[12px] text-gray-200 line-clamp-2">{need.description}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {index > 0 && (index + 1) % 6 === 0 && (
                        <AdWrapper freeUserOnly={isFreeUser}>
                          {Math.floor((index + 1) / 6) % 2 === 1 ? (
                            <CourseBannerAd />
                          ) : (
                            <GoogleAdSense adSlot="1234567890" />
                          )}
                        </AdWrapper>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>

              {hasMore && (
                <div ref={observerTarget} className="col-span-full flex justify-center py-8">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span className="text-sm">Carregando mais serviços...</span>
                    </div>
                  )}
                </div>
              )}

              {!hasMore && searchResults.length > 0 && (
                <p className="col-span-full text-center text-gray-500 text-sm py-4">Você chegou ao fim da lista</p>
              )}
            </>
          )}

          {selectedNeedForDetails && (
            <NeedDetailsDialog
              need={selectedNeedForDetails}
              isOpen={!!selectedNeedForDetails}
              onClose={() => setSelectedNeedForDetails(null)}
              onStatusUpdate={performSearch}
            />
          )}

          {selectedNeedForInterest && email && (
            <InterestDialog
              need={selectedNeedForInterest}
              isOpen={!!selectedNeedForInterest}
              onClose={() => setSelectedNeedForInterest(null)}
              currentUserEmail={email}
              onActionSuccess={handleActionSuccess}
            />
          )}

          {selectedNeedForChatManagement && email && (
            <ChatManagementDialog
              need={selectedNeedForChatManagement}
              isOpen={!!selectedNeedForChatManagement}
              onClose={() => setSelectedNeedForChatManagement(null)}
              currentUserEmail={email}
              onChatActionSuccess={handleActionSuccess}
            />
          )}
        </div>

        <div className="hidden xl:block w-64 flex-shrink-0">
          <AdWrapper freeUserOnly={isFreeUser}>
            <AffiliateSidebarVertical />
          </AdWrapper>
        </div>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage.url || "/placeholder.svg"}
            alt={selectedImage.alt}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  )
}

function getCategoryImage(category: string): string {
  const images: Record<string, string> = {
    eletricista: "/leaky-faucet.png",
    encanador: "/leaky-faucet.png",
    marceneiro: "/shelf-installation.png",
    pintor: "/sofa-cleaning.png",
    default: "/placeholder.svg",
  }
  return images[category] || images.default
}

export default SearchRequests
