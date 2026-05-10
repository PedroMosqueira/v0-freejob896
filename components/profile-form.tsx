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
import { PhoneValidationModal } from "@/components/phone-validation-modal"

interface ProfileFormProps {
  profile: UserProfile
  userEmail: string
}

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const [state, formAction] = useFormState(updateUserProfile, null)
  const [fullName, setFullName] = useState(profile.fullName || "")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState(profile.phone || "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [phoneValidated, setPhoneValidated] = useState(profile.phoneValidated || false)
  const { toast } = useToast()
  const router = useRouter()

  // Função para extrair primeiro e último nome
  const extractNameParts = (full: string) => {
    const parts = full.trim().split(/\s+/).filter(Boolean)
    
    if (parts.length === 0) return { first: "", last: "" }
    if (parts.length === 1) return { first: parts[0], last: "" }
    
    const firstName = parts[0]
    const lastName = parts[parts.length - 1]
    
    return { first: firstName, last: lastName }
  }

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 2) return cleaned
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
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

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value)
    setPhone(formatted)
    if (errors.phone) {
      setErrors({ ...errors, phone: undefined })
    }
  }

  const handlePhoneValidationSuccess = (phone: string) => {
    setPhone(phone)
    setPhoneValidated(true)
    setShowPhoneModal(false)
    toast({
      title: "Telefone validado!",
      description: "Seu telefone foi validado com sucesso.",
      variant: "success",
    })
    router.refresh()
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
              ✓ Será exibido como: <strong>{firstName} {lastName}</strong>
            </p>
          )}
        </div>

        {/* Inputs hidden para firstName e lastName */}
        <input type="hidden" name="firstName" value={firstName} />
        <input type="hidden" name="lastName" value={lastName} />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="phone">Telefone</Label>
            {phoneValidated && (
              <span className="text-xs text-green-600 font-semibold">✓ Validado</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              id="phone"
              name="phone"
              placeholder="(11) 98765-4321"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              disabled={phoneValidated}
              className={`${errors.phone ? "border-red-500" : ""}`}
            />
            {!phoneValidated && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPhoneModal(true)}
                className="whitespace-nowrap"
              >
                Validar
              </Button>
            )}
          </div>
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone}</p>
          )}
        </div>

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

      <PhoneValidationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={handlePhoneValidationSuccess}
        currentUserEmail={userEmail}
      />
    </Card>
  )
}
