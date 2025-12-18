"use client"

import React from "react"
import type { ReactElement } from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { filterNeeds, getNeed, type Need, type NeedStatus } from "@/lib/needs-store"
import { useAuth } from "@/hooks/use-auth"
import { NeedDetailsDialog } from "./need-details-dialog"
import { InterestDialog } from "./interest-dialog"
import { ChatManagementDialog } from "./chat-management-dialog"
import { calculateDistance, formatDistance } from "@/lib/calculate-distance"
import { AffiliateSidebar, AffiliateSidebarVertical } from "@/components/affiliate-sidebar"
import { AdWrapper } from "@/components/ad-wrapper"
import { SearchRequestsSkeleton } from "./search-requests-skeleton"
import { CourseBannerAd } from "./course-banner-ad"
import { GoogleAdSense } from "./google-adsense"
import { AFFILIATE_CONFIG } from "@/lib/affiliate-config"
import { FilterForm } from "./filter-form"

interface SearchRequestsProps {
  initialShowMyRequests?: boolean
  initialShowMyProfessionalServices?: boolean
  showFilters?: boolean
  searchQuery?: string
  initialQuery?: string
}

function SearchRequests({
  initialShowMyRequests = false,
  initialShowMyProfessionalServices = false,
  showFilters = false,
  searchQuery = "",
  initialQuery = "",
}: SearchRequestsProps): ReactElement {
  const { email, isFreeUser } = useAuth()

  const [query, setQuery] = useState(initialQuery)
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

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery)

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

      const searchTerm = debouncedSearchQuery || query
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
          fetchedNeeds = fetchedNeeds.map((need) => {
            if (need.latitude && need.longitude) {
              const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                need.latitude,
                need.longitude,
              )
              return { ...need, distance }
            }
            return need
          })
        }

        if (isLoadMore) {
          setSearchResults((prev) => {
            const combined = [...prev, ...fetchedNeeds]
            return combined.sort((a, b) => {
              const distA = a.distance ?? Number.POSITIVE_INFINITY
              const distB = b.distance ?? Number.POSITIVE_INFINITY
              return distA - distB
            })
          })
        } else {
          const sorted = fetchedNeeds.sort((a, b) => {
            const distA = a.distance ?? Number.POSITIVE_INFINITY
            const distB = b.distance ?? Number.POSITIVE_INFINITY
            return distA - distB
          })
          setSearchResults(sorted)
        }

        if (!isLoadMore) {
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
      debouncedSearchQuery,
      page,
      userLocation,
    ],
  )

  const handleSearch = useCallback(() => {
    // Implement search logic here
  }, [])

  const getStatusBadgeClass = useCallback((status: NeedStatus) => {
    switch (status) {
      case "open":
        return "bg-green-500"
      case "pending":
        return "bg-yellow-500"
      case "accepted":
        return "bg-blue-500"
      case "completed":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }, [])

  const handleActionSuccess = useCallback(() => {
    // Implement action success logic here
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setPage(0)
    setHasMore(true)
    performSearch(false)
  }, [debouncedSearchQuery, showMyRequests, showMyProfessionalServices])

  useEffect(() => {
    setPage(0)
    setHasMore(true)
    performSearch(false)
  }, [query, category, city, status])

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
            console.error("Error getting user city:", error)
          }

          setIsGettingLocation(false)
        },
        (error) => {
          console.error("Geolocation error:", error.message, error.code)
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
    if (showFilters) {
      setIsMobileFilterOpen(true)
    }
  }, [showFilters])

  useEffect(() => {
    const handleOpenNeed = async (event: any) => {
      const needId = event.detail

      if (!needId) {
        return
      }

      try {
        const need = await getNeed(needId)

        if (need) {
          setSelectedNeedForDetails(need)
        }
      } catch (error) {
        console.error("Error opening need:", error)
      }
    }

    window.addEventListener("openNeed", handleOpenNeed)

    return () => {
      window.removeEventListener("openNeed", handleOpenNeed)
    }
  }, [])

  const filters = useMemo(() => ({ category, city, status }), [category, city, status])

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <AdWrapper freeUserOnly={isFreeUser}>
        <AffiliateSidebar />
      </AdWrapper>

      <div className="flex gap-6">
        <div className="flex-1 grid gap-4 sm:gap-6">
          {/* Mobile Filter Sheet */}
          <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle className="text-lg">Filtros</SheetTitle>
              </SheetHeader>
              <div className="py-4 overflow-y-auto max-h-[calc(100vh-80px)]">
                <FilterForm
                  query={query}
                  setQuery={setQuery}
                  city={city}
                  setCity={setCity}
                  status={status}
                  setStatus={setStatus}
                  category={category}
                  setCategory={setCategory}
                  onSubmit={handleSearch}
                />
              </div>
            </SheetContent>
          </Sheet>

          {isSearching && searchResults.length === 0 ? (
            <SearchRequestsSkeleton />
          ) : searchResults.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum serviço encontrado.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
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

                  const showCourseAd = (index + 1) % 6 === 0 && index > 0
                  const showGoogleAd = (index + 1) % 12 === 0 && index > 0

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

                          {need.distance !== undefined &&
                            need.distance !== null &&
                            need.distance !== Number.POSITIVE_INFINITY &&
                            !isNaN(need.distance) && (
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

                      {showCourseAd && <CourseBannerAd category={filters.category} />}

                      {showGoogleAd && AFFILIATE_CONFIG.googleAdsense.enabled && (
                        <GoogleAdSense adSlot={AFFILIATE_CONFIG.googleAdsense.adSlots.inFeed} adFormat="fluid" />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>

              {hasMore && (
                <div ref={observerTarget} className="flex justify-center py-8">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span className="text-sm">Carregando mais serviços...</span>
                    </div>
                  )}
                </div>
              )}

              {!hasMore && searchResults.length > 0 && (
                <p className="text-center text-gray-500 text-sm py-4">Você chegou ao fim da lista</p>
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
    </div>
  )
}

function getCategoryImage(category: string): string {
  const images: Record<string, string> = {
    eletricista: "/electrician-working.png",
    encanador: "/plumber-fixing-pipes.png",
    pedreiro: "/mason-building-wall.jpg",
    pintor: "/painter-painting-wall.png",
    marceneiro: "/carpenter-woodworking.jpg",
    mecanico: "/mechanic-fixing-car.jpg",
    jardineiro: "/gardener-trimming-plants.jpg",
    faxineiro: "/cleaner-cleaning-house.jpg",
  }
  return images[category] || "/service-professional.jpg"
}

export default SearchRequests
