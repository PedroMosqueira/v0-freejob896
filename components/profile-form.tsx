"use client"

import { type UserProfile, updateUserProfile } from "@/lib/user-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { useFormState } from "react-dom"
import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

interface ProfileFormProps {
  profile: UserProfile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction] = useFormState(updateUserProfile, null)
  const { toast } = useToast()

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Sucesso!",
        description: state.message,
      })
    } else if (state?.message) {
      toast({
        title: "Erro",
        description: state.message,
        variant: "destructive",
      })
    }
  }, [state, toast])

  return (
    <Card className="p-6 dark:bg-gray-800/50 dark:border-gray-700">
      <h3 className="text-xl font-semibold mb-6 dark:text-gray-100">Informações do Perfil</h3>

      <form action={formAction} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={profile.fullName || ""}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" defaultValue={profile.city || ""} placeholder="Sua cidade" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Biografia</Label>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={profile.bio || ""}
            placeholder="Conte um pouco sobre você..."
            rows={4}
          />
        </div>

        {profile.isProfessional && (
          <div className="space-y-2">
            <Label htmlFor="skills">Habilidades (separadas por vírgula)</Label>
            <Input
              id="skills"
              name="skills"
              defaultValue={profile.skills?.join(", ") || ""}
              placeholder="Ex: Encanamento, Elétrica, Pintura"
            />
            <p className="text-sm text-muted-foreground">Separe as habilidades com vírgulas.</p>
          </div>
        )}

        <Button type="submit" className="w-full md:w-auto">
          Salvar Alterações
        </Button>
      </form>
    </Card>
  )
}
