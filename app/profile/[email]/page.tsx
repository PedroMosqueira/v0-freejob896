import { notFound } from "next/navigation"
import { getPublicProfile } from "@/lib/user-profile"
import { ProfileHeader } from "@/components/profile-header"
import { ProfileStats } from "@/components/profile-stats"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import Link from "next/link"

interface PublicProfilePageProps {
  params: Promise<{ email: string }>
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { email } = await params
  const decodedEmail = decodeURIComponent(email)

  const profile = await getPublicProfile(decodedEmail)

  if (!profile) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <ProfileHeader profile={profile} isPublic />
        <ProfileStats profile={profile} />

        <div className="flex justify-center">
          <Button asChild>
            <Link href={`/?search=${encodeURIComponent(profile.fullName || profile.email)}`}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Entrar em Contato
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
