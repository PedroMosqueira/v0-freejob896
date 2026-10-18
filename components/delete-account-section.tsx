"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const CONFIRMATION_WORD = "EXCLUIR"

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canDelete = confirmation.trim().toUpperCase() === CONFIRMATION_WORD && !isDeleting

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: CONFIRMATION_WORD }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || "Não foi possível excluir sua conta.")
        setIsDeleting(false)
        return
      }
      window.location.href = "/?conta=excluida"
    } catch {
      setError("Erro de conexão. Tente novamente.")
      setIsDeleting(false)
    }
  }

  return (
    <section
      aria-labelledby="delete-account-title"
      className="flex flex-col gap-4 rounded-lg border border-destructive/40 p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="delete-account-title" className="text-lg font-semibold text-destructive">
          Excluir conta
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Apaga permanentemente seu perfil, pedidos, propostas, conversas, avaliações e notificações. Se você tiver
          uma assinatura, ela é cancelada na hora, sem novas cobranças. Essa ação não pode ser desfeita.
        </p>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setConfirmation("")
            setError(null)
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="destructive" className="w-fit gap-2">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Excluir minha conta
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conta permanentemente?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Todos os seus dados serão apagados e você será desconectado. Para confirmar, digite{" "}
              <strong className="text-foreground">{CONFIRMATION_WORD}</strong> abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-confirmation">Confirmação</Label>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={CONFIRMATION_WORD}
              autoComplete="off"
              disabled={isDeleting}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!canDelete} className="gap-2">
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
