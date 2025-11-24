"use client"

import Link from "next/link"
import { Sparkles } from 'lucide-react'

interface AdCardProps {
  className?: string
}

export function AdCard({ className = '' }: AdCardProps) {
  return (
    <div className={`bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white ${className}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-white/20 rounded-lg">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Seja Premium</h3>
          <p className="text-sm text-white/90">
            Interesse ilimitado em serviços e sem anúncios
          </p>
        </div>
      </div>
      
      <ul className="space-y-2 mb-4 text-sm">
        <li className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 bg-white rounded-full" />
          <span>Lances e propostas ilimitadas</span>
        </li>
        <li className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 bg-white rounded-full" />
          <span>Perfil destacado nos resultados</span>
        </li>
        <li className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 bg-white rounded-full" />
          <span>Badge Premium no perfil</span>
        </li>
      </ul>

      <Link
        href="/upgrade"
        className="block w-full py-2.5 bg-white text-blue-600 font-semibold text-center rounded-lg hover:bg-blue-50 transition-colors"
      >
        Assinar por R$ 29,90/mês
      </Link>
    </div>
  )
}
