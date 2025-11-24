"use client"

import { X, Sparkles } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

interface AdBannerProps {
  position?: "top" | "bottom" | "inline"
  className?: string
}

export function AdBanner({ position = "inline", className = "" }: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div
      className={`relative bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 border border-green-200 dark:border-green-800 rounded-lg p-4 ${className}`}
    >
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded"
        aria-label="Fechar anúncio"
      >
        <X className="h-4 w-4 text-green-600 dark:text-green-400" />
      </button>

      <div className="flex items-center justify-between gap-4 pr-8">
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Plataforma 100% gratuita no lançamento!
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            Todos os recursos liberados. Ganhe comissões e cashback em transações.
          </p>
        </div>
        <Link
          href="/upgrade"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Saiba Mais
        </Link>
      </div>
    </div>
  )
}
