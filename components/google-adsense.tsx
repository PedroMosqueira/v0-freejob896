"use client"

import { useEffect, useRef } from "react"
import { AFFILIATE_CONFIG } from "@/lib/affiliate-config"

interface GoogleAdSenseProps {
  adSlot: string
  adFormat?: "auto" | "fluid" | "rectangle" | "vertical" | "horizontal"
  adLayout?: string
  fullWidthResponsive?: boolean
  className?: string
}

export function GoogleAdSense({
  adSlot,
  adFormat = "auto",
  adLayout,
  fullWidthResponsive = true,
  className = "",
}: GoogleAdSenseProps) {
  const adInitialized = useRef(false)

  useEffect(() => {
    if (!adInitialized.current) {
      try {
        // @ts-ignore
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        adInitialized.current = true
      } catch (error) {
        console.error("AdSense error:", error)
      }
    }

    return () => {
      adInitialized.current = false
    }
  }, [])

  return (
    <div
      className={`group relative overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 ease-out cursor-pointer dark:bg-gray-800 dark:border-gray-700 rounded-none border aspect-square p-[1px] ${className}`}
    >
      <div className="relative w-full h-full">
        {/* AdSense Content */}
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", height: "100%" }}
            data-ad-client={AFFILIATE_CONFIG.googleAdsense.clientId}
            data-ad-slot={adSlot}
            data-ad-format={adFormat}
            data-ad-layout={adLayout}
            data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
          />
        </div>

        {/* Badge no topo */}
        <div className="absolute top-2 right-2 z-30">
          <span className="text-white font-bold text-xs whitespace-nowrap bg-purple-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-lg border border-purple-400/50">
            ⭐ Anúncio
          </span>
        </div>

        {/* Footer com efeito hover igual aos cards de serviço */}
        <div className="absolute -bottom-px -left-px -right-px h-12 group-hover:h-[33%] bg-gradient-to-t from-gray-900/95 via-gray-800/90 to-transparent dark:from-gray-950/98 dark:via-gray-900/95 backdrop-blur-sm transition-all duration-500 ease-out flex flex-col z-20 p-0">
          <div className="px-2 pt-2 pb-1.5">
            <h3 className="font-semibold text-sm text-white line-clamp-1">Conteúdo Patrocinado</h3>
          </div>

          <div className="px-2 pb-2 flex-1 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            <div className="space-y-1.5">
              <p className="text-[12px] text-gray-200 line-clamp-2">
                Ofertas selecionadas para você. Clique para saber mais sobre produtos e serviços relevantes.
              </p>
              <span className="text-purple-400 font-semibold text-[10px]">Google AdSense</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
