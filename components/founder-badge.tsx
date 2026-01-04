import { Crown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function FounderBadge() {
  return (
    <Badge
      variant="secondary"
      className="bg-gradient-to-r from-amber-400 to-amber-600 text-white px-4 py-2 text-sm font-semibold"
    >
      <Crown className="h-4 w-4 mr-1" />
      Membro Fundador
    </Badge>
  )
}
