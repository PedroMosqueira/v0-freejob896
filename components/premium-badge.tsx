"use client"

import { Crown } from 'lucide-react'

export function PremiumBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded ${className}`}>
      <Crown className="h-3 w-3" />
      <span>PREMIUM</span>
    </span>
  )
}
