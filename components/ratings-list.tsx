"use client"

import { useEffect, useState } from "react"
import { Star, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUserRatings, type Rating } from "@/lib/ratings"

interface RatingsListProps {
  userEmail: string
  onRatingsLoaded?: (count: number) => void
}

export function RatingsList({ userEmail, onRatingsLoaded }: RatingsListProps) {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRatings()
  }, [userEmail])

  const loadRatings = async () => {
    setLoading(true)
    const data = await getUserRatings(userEmail)
    setRatings(data)
    setLoading(false)

    if (onRatingsLoaded) {
      onRatingsLoaded(data.length)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Carregando avaliações...</p>
        </CardContent>
      </Card>
    )
  }

  if (ratings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Nenhuma avaliação ainda</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {ratings.map((rating) => (
        <Card key={rating.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={rating.raterImageUrl || "/placeholder.svg"} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{rating.raterName || "Usuário"}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {new Date(rating.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= rating.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                  />
                ))}
              </div>
            </div>
          </CardHeader>
          {rating.comment && (
            <CardContent>
              <p className="text-sm">{rating.comment}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
