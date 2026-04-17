"use client"

import { type UserProfile, updateUserProfile } from "@/lib/user-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { useFormState } from "react-dom"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface ProfileFormProps {
  profile: UserProfile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction] = useFormState(updateUserProfile, null)
  const [fullName, setFullName] = useState(profile.fullName || "")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const router = useRouter()

  // Função para extrair nome e sobrenome do nome completo
  const extractNameParts = (full: string) => {
    const parts = full.trim().split(/\s+/)
    if (parts.length === 0) return { first: "", last: "" }
    if (parts.length === 1) return { first: parts[0], last: "" }
    return { first: parts[0], last: parts.slice(1).join(" ") }
  }

  const handleFullNameChange = (value: string) => {
    setFullName(value)
    const { first, last } = extractNameParts(value)
    setFirstName(first)
    setLastName(last)
    if (errors.fullName) {
      setErrors({ ...errors, fullName: undefined })
    }
  }

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Sucesso!",
        description: state.message,
      })
      router.refresh()
    } else if (state?.message) {
      toast({
        title: "Erro",
        description: state.message,
        variant: "destructive",
      })
    }
  }, [state, toast, router])

  return (
    <Card className="p-6 dark:bg-gray-800/50 dark:border-gray-700">
      <h3 className="text-xl font-semibold mb-6 dark:text-gray-100">Informações do Perfil</h3>

      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo</Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder="João Silva"
            value={fullName}
            onChange={(e) => handleFullNameChange(e.target.value)}
            className={`${errors.fullName ? "border-red-500" : ""}`}
          />
          {errors.fullName && (
            <p className="text-sm text-red-500">{errors.fullName}</p>
          )}
          {fullName && firstName && lastName && (
            <p className="text-xs text-green-600">
              ✓ Será exibido como: <strong>{firstName}</strong> {lastName}
            </p>
          )}
        </div>

        {/* Inputs hidden para firstName e lastName */}
        <input type="hidden" name="firstName" value={firstName} />
        <input type="hidden" name="lastName" value={lastName} />

        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" name="city" defaultValue={profile.city || ""} placeholder="Sua cidade" />
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
