import type { UserProfile } from "@/lib/user-profile"
import type { Rating } from "@/lib/ratings"
import { Card } from "@/components/ui/card"
import { Star, Briefcase, ClipboardCheck, ChevronRight } from "lucide-react"
import { ProfileRatingsDialog } from "@/components/profile-ratings-dialog"

interface ProfileStatsProps {
  profile: UserProfile
  totalRatings?: number
  ratings?: Rating[]
}

export function ProfileStats({ profile, totalRatings, ratings }: ProfileStatsProps) {
  const count = ratings?.length ?? totalRatings
  const ratingContent = (
    <div className="flex items-center gap-3">
      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
        <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm text-muted-foreground dark:text-gray-400">Avaliação</p>
        <p className="text-2xl font-bold dark:text-white">{profile.rating.toFixed(1)} / 5.0</p>
        {count !== undefined && (
          <p className="text-xs text-muted-foreground dark:text-gray-500">
            {count === 0 ? "Nenhuma avaliação ainda" : `${count} ${count === 1 ? "avaliação" : "avaliações"}`}
          </p>
        )}
      </div>
      {ratings && ratings.length > 0 && (
        <span className="flex items-center gap-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
          Ver comentários
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {ratings && ratings.length > 0 ? (
        <ProfileRatingsDialog
          ratings={ratings}
          average={profile.rating}
          profileName={profile.fullName?.split(" ")[0] || "este usuário"}
        >
          <button
            type="button"
            className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm transition-colors hover:border-blue-400 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-500"
          >
            {ratingContent}
          </button>
        </ProfileRatingsDialog>
      ) : (
        <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">{ratingContent}</Card>
      )}

      <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground dark:text-gray-400">Serviços Executados</p>
            <p className="text-2xl font-bold dark:text-white">{profile.servicesExecuted}</p>
            <p className="text-xs text-muted-foreground dark:text-gray-500">Como profissional</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <ClipboardCheck className="h-6 w-6 text-green-600 dark:text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground dark:text-gray-400">Solicitações Concluídas</p>
            <p className="text-2xl font-bold dark:text-white">{profile.requestsCompleted}</p>
            <p className="text-xs text-muted-foreground dark:text-gray-500">Como solicitante</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
