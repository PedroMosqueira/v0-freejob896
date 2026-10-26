"use client"

import type { ReactNode } from "react"
import { Star, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { Rating } from "@/lib/ratings"

interface ProfileRatingsDialogProps {
  ratings: Rating[]
  average: number
  profileName: string
  children: ReactNode
}

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} de 5 estrelas`} role="img">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={`${size} ${star <= Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
        />
      ))}
    </div>
  )
}

export function ProfileRatingsDialog({ ratings, average, profileName, children }: ProfileRatingsDialogProps) {
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: ratings.filter((r) => r.rating === stars).length,
  }))

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>Avaliações de {profileName}</DialogTitle>
          <DialogDescription>
            {ratings.length} {ratings.length === 1 ? "avaliação" : "avaliações"} de quem já fez negócio com esse usuário.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-6 border-b px-6 py-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl font-bold">{average.toFixed(1)}</span>
            <Stars value={average} />
          </div>
          <ul className="flex flex-1 flex-col gap-1" aria-label="Distribuição das notas">
            {distribution.map(({ stars, count }) => (
              <li key={stars} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 text-right">{stars}</span>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-yellow-400"
                    style={{ width: `${ratings.length ? (count / ratings.length) * 100 : 0}%` }}
                  />
                </span>
                <span className="w-5 text-right">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <ul className="flex-1 divide-y overflow-y-auto">
          {ratings.map((rating) => (
            <li key={rating.id} className="flex flex-col gap-2 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {rating.raterImageUrl && <AvatarImage src={rating.raterImageUrl} alt="" />}
                    <AvatarFallback>
                      <User className="h-4 w-4" aria-hidden="true" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{rating.raterName?.split(" ")[0] || "Usuário"}</span>
                    <time dateTime={rating.createdAt} className="text-xs text-muted-foreground">
                      {new Date(rating.createdAt).toLocaleDateString("pt-BR")}
                    </time>
                  </div>
                </div>
                <Stars value={rating.rating} size="h-3.5 w-3.5" />
              </div>
              {rating.comment?.trim() ? (
                <p className="text-sm leading-relaxed text-pretty">{rating.comment}</p>
              ) : (
                <p className="text-xs italic text-muted-foreground">Sem comentário</p>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
