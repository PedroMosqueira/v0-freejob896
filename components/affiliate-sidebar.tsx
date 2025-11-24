"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { useRef, useState, useEffect } from "react"
import { AMAZON_PRODUCTS } from "@/lib/affiliate-config"

interface Product {
  name: string
  price: string
  image: string
  link: string
}

const products: Product[] = Object.values(AMAZON_PRODUCTS).map((product) => ({
  name: product.name,
  price: product.price.replace("R$ ", "").replace(",", "."),
  image: product.image,
  link: product.link,
}))

export function AffiliateSidebar() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [visibleCards, setVisibleCards] = useState(5)
  const [cardWidth, setCardWidth] = useState(176)

  const calculateVisibleCards = () => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.offsetWidth
      const MIN_CARD_WIDTH = 160
      const GAP = 16

      const possibleCards = Math.floor((containerWidth + GAP) / (MIN_CARD_WIDTH + GAP))
      const cardsToShow = Math.max(1, Math.min(possibleCards, products.length))

      const calculatedWidth = Math.floor((containerWidth - GAP * (cardsToShow - 1)) / cardsToShow)

      setVisibleCards(cardsToShow)
      setCardWidth(calculatedWidth)

      setTimeout(checkScrollButtons, 100)
    }
  }

  useEffect(() => {
    calculateVisibleCards()

    const resizeObserver = new ResizeObserver(calculateVisibleCards)
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current)
    }

    window.addEventListener("resize", calculateVisibleCards)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", calculateVisibleCards)
    }
  }, [])

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 5)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5)
    }
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = cardWidth + 16
      const newScrollLeft =
        direction === "left"
          ? scrollContainerRef.current.scrollLeft - scrollAmount
          : scrollContainerRef.current.scrollLeft + scrollAmount

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      })

      setTimeout(checkScrollButtons, 300)
    }
  }

  return (
    <>
      {/* Mobile version */}
      <div className="lg:hidden mb-4">
        <Card className="p-3 bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">🛠️ Ferramentas Recomendadas</h3>
            <span className="text-[9px] text-gray-700 dark:text-gray-300">Patrocinado</span>
          </div>

          <div className="relative">
            {canScrollLeft && (
              <button
                onClick={() => scroll("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-background p-1 rounded-full shadow-md border border-border"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div
              ref={scrollContainerRef}
              onScroll={checkScrollButtons}
              className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            >
              {products.map((product, idx) => (
                <a
                  key={idx}
                  href={product.link}
                  target="_blank"
                  rel="noreferrer nofollow sponsored noopener"
                  className="flex-shrink-0 w-28 bg-card p-2 rounded-lg border border-border hover:shadow-md transition-shadow snap-start"
                >
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-20 object-cover rounded mb-1.5"
                  />
                  <p className="font-medium text-[9px] line-clamp-2 mb-1 h-7 text-foreground">{product.name}</p>
                  <p className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                    R$ {Number.parseFloat(product.price).toFixed(2)}
                  </p>
                </a>
              ))}
            </div>

            {canScrollRight && (
              <button
                onClick={() => scroll("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-background p-1 rounded-full shadow-md border border-border"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* Desktop version */}
      <div className="hidden lg:block mb-4">
        <Card className="p-4 bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛠️</span>
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Ferramentas Recomendadas</h3>
                <p className="text-[10px] text-gray-700 dark:text-gray-300">Produtos selecionados para profissionais</p>
              </div>
            </div>
            <span className="text-[10px] text-gray-700 dark:text-gray-300">Patrocinado</span>
          </div>

          <div className="relative">
            {canScrollLeft && (
              <button
                onClick={() => scroll("left")}
                className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 bg-background/95 hover:bg-background p-2 rounded-full shadow-lg hover:scale-110 transition-transform border border-border"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div ref={scrollContainerRef} onScroll={checkScrollButtons} className="flex gap-4 overflow-x-hidden">
              {products.map((product, idx) => (
                <a
                  key={idx}
                  href={product.link}
                  target="_blank"
                  rel="noreferrer nofollow sponsored noopener"
                  style={{ width: `${cardWidth}px`, flexShrink: 0 }}
                  className="bg-card p-3 rounded-lg border border-border hover:shadow-lg hover:border-blue-400 transition-all group"
                >
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-28 object-cover rounded mb-2 group-hover:scale-105 transition-transform"
                  />
                  <p className="font-medium text-xs line-clamp-2 mb-2 h-8 text-foreground">{product.name}</p>
                  <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mb-2">
                    R$ {Number.parseFloat(product.price).toFixed(2)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-[10px] border-cyan-600 text-white bg-cyan-500 hover:bg-cyan-600"
                  >
                    Ver Oferta
                  </Button>
                </a>
              ))}
            </div>

            {canScrollRight && (
              <button
                onClick={() => scroll("right")}
                className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 bg-background/95 hover:bg-background p-2 rounded-full shadow-lg hover:scale-110 transition-transform border border-border"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}

export function AffiliateSidebarVertical() {
  return (
    <div className="sticky top-4">
      <Card className="p-3 bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🛠️</span>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Ferramentas</h3>
          </div>
          <p className="text-[10px] text-gray-700 dark:text-gray-300">Produtos recomendados</p>
          <span className="text-[9px] text-gray-700 dark:text-gray-300 block mt-1">Patrocinado</span>
        </div>

        <div className="space-y-3">
          {products.slice(0, 3).map((product, idx) => (
            <a
              key={idx}
              href={product.link}
              target="_blank"
              rel="noreferrer nofollow sponsored noopener"
              className="block bg-card p-2 rounded-lg border border-border hover:shadow-lg hover:border-blue-400 transition-all group"
            >
              <img
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-32 object-cover rounded mb-2 group-hover:scale-105 transition-transform"
              />
              <p className="font-medium text-xs line-clamp-2 mb-2 h-8 text-foreground">{product.name}</p>
              <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mb-2">
                R$ {Number.parseFloat(product.price).toFixed(2)}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-[10px] border-cyan-600 text-white bg-cyan-500 hover:bg-cyan-600"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Ver Oferta
              </Button>
            </a>
          ))}
        </div>
      </Card>
    </div>
  )
}
