"use client"

import { BookOpen } from "lucide-react"
import { useState, useEffect } from "react"
import { HOTMART_COURSES } from "@/lib/affiliate-config"

interface CourseBanner {
  id: string
  title: string
  description: string
  imageUrl: string
  ctaText: string
  link: string
  category: string
  provider: string
}

const courseBanners: CourseBanner[] = Object.values(HOTMART_COURSES)

interface CourseBannerAdProps {
  category?: string
  className?: string
}

export function CourseBannerAd({ category, className = "" }: CourseBannerAdProps) {
  const [currentBanner, setCurrentBanner] = useState<CourseBanner | null>(null)

  useEffect(() => {
    let banner = courseBanners.find((b) => b.category === category)

    if (!banner) {
      banner = courseBanners[Math.floor(Math.random() * courseBanners.length)]
    }

    setCurrentBanner(banner)
  }, [category])

  if (!currentBanner) return null

  const handleClick = () => {
    console.log("[v0] Course banner clicked:", currentBanner.title)
    window.open(currentBanner.link, "_blank", "noopener,noreferrer")
  }

  return (
    <div
      className={`group relative overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 ease-out cursor-pointer dark:bg-gray-800 dark:border-gray-700 rounded-none border aspect-square p-[1px] ${className}`}
      onClick={handleClick}
    >
      <div className="relative w-full h-full">
        <img
          src={currentBanner.imageUrl || "/placeholder.svg"}
          alt={currentBanner.title}
          className="w-full h-full object-cover"
        />

        {/* Badge no topo direito */}
        <div className="absolute top-2 right-2 z-30">
          <span className="text-white font-bold text-xs whitespace-nowrap bg-cyan-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-lg border border-cyan-400/50 flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            Curso
          </span>
        </div>

        {/* Footer com efeito hover igual aos cards de serviço */}
        <div className="absolute -bottom-px -left-px -right-px h-12 group-hover:h-[33%] bg-gradient-to-t from-gray-900/95 via-gray-800/90 to-transparent dark:from-gray-950/98 dark:via-gray-900/95 backdrop-blur-sm transition-all duration-500 ease-out flex flex-col z-20 p-0">
          <div className="px-2 pt-2 pb-1.5">
            <h3 className="font-semibold text-sm text-white line-clamp-1">{currentBanner.title}</h3>
          </div>

          <div className="px-2 pb-2 flex-1 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className="text-gray-300 line-clamp-1 text-[11px]">📚 {currentBanner.category}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Anúncio
                </span>
                <span className="text-cyan-400 font-semibold text-[10px]">{currentBanner.provider}</span>
              </div>

              <p className="text-[12px] text-gray-200 line-clamp-2">{currentBanner.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
