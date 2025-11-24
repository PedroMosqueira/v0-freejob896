"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"

interface AdWrapperProps {
  children: React.ReactNode
}

export function AdWrapper({ children }: AdWrapperProps) {
  const { isFreeUser, isLoading } = useAuth()

  // Durante loading, não mostra nada para evitar flash
  if (isLoading) {
    return null
  }

  // Só mostra anúncios se o usuário for free
  if (!isFreeUser) {
    return null
  }

  return <>{children}</>
}
