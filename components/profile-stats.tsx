import type { UserProfile } from "@/lib/user-profile"
import { Card } from "@/components/ui/card"
import { Star, Briefcase, ClipboardCheck } from "lucide-react"

interface ProfileStatsProps {
  profile: UserProfile
  totalRatings?: number
}

export function ProfileStats({ profile, totalRatings }: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
            <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground dark:text-gray-400">Avaliação</p>
            <p className="text-2xl font-bold dark:text-white">{profile.rating.toFixed(1)} / 5.0</p>
            {totalRatings !== undefined && totalRatings > 0 && (
              <p className="text-xs text-muted-foreground dark:text-gray-500">
                {totalRatings} {totalRatings === 1 ? "avaliação" : "avaliações"}
              </p>
            )}
          </div>
        </div>
      </Card>

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
