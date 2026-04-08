"use client"

import type React from "react"

import { useState } from "react"
import { Star } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createRating } from "@/lib/ratings"

interface RatingDialogProps {
  isOpen: boolean
  onClose: () => void
  professionalEmail: string
  requesterEmail: string
  needId: string
  onSuccess?: () => void
}

export default function RatingDialog({
  isOpen,
  onClose,
  professionalEmail,
  requesterEmail,
  needId,
  onSuccess,
}: RatingDialogProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError("Por favor, selecione uma nota")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("ratedUserEmail", professionalEmail)
      formData.append("raterEmail", requesterEmail)
      formData.append("rating", rating.toString())
      formData.append("needId", needId)
      if (comment) {
        formData.append("comment", comment)
      }

      const result = await createRating(null, formData)

      if (result?.success) {
        setRating(0)
        setComment("")
        onSuccess?.()
        onClose()
      } else {
        setError(result?.message || "Erro ao enviar avaliação")
      }
    } catch (err) {
      console.error("Error submitting rating:", err)
      setError("Erro ao enviar avaliação. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100">Avaliar Profissional</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Sua avaliação ajuda outros usuários a conhecer melhor este profissional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="dark:text-gray-200">Nota</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                {rating} {rating === 1 ? "estrela" : "estrelas"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment" className="dark:text-gray-200">
              Comentário (opcional)
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte sobre sua experiência com este profissional..."
              rows={4}
              className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={rating === 0 || isSubmitting}
              className="flex-1 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
