"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { ProfileForm } from "@/components/profile-form"
import { ProfileHeader } from "@/components/profile-header"
import { ProfileStats } from "@/components/profile-stats"
import { PhoneVerification } from "@/components/phone-verification"
import { getUserProfile, type UserProfile } from "@/lib/user-profile"
import { Loader2, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { RatingsList } from "@/components/ratings-list"
import { CashbackDashboard } from "@/components/cashback-dashboard"

export default function ProfilePage() {
  const router = useRouter()
  const { email, isLoading: isAuthLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      if (isAuthLoading) return

      if (!email) {
        router.push("/")
        return
      }

      try {
        setIsLoading(true)
        const userProfile = await getUserProfile(email)

        if (!userProfile) {
          setError("Erro ao carregar perfil")
        } else {
          setProfile(userProfile)
        }
      } catch (err) {
        console.error("Error loading profile:", err)
        setError("Erro ao carregar perfil")
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [email, isAuthLoading, router])

  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">{error || "Erro ao carregar perfil. Tente novamente."}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <Button asChild variant="outline">
          <Link href="/" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Página Inicial
          </Link>
        </Button>
      </div>

      <div className="space-y-8">
        <ProfileHeader profile={profile} />
        <ProfileStats profile={profile} />

        <div>
          <h2 className="text-2xl font-bold mb-4">Saldo e Comissões</h2>
          <CashbackDashboard />
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Avaliações Recebidas</h2>
          <RatingsList userEmail={profile.email} />
        </div>

        <PhoneVerification profile={profile} />
        <ProfileForm profile={profile} />
      </div>
    </div>
  )
}
