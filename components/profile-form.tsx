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
  const [isProfessional, setIsProfessional] = useState(profile.isProfessional || false)
  const [skills, setSkills] = useState(profile.skills?.join(", ") || "")
  const [city, setCity] = useState(profile.city || "")
  const [bio, setBio] = useState(profile.bio || "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [phoneValidated, setPhoneValidated] = useState(profile.phoneValidated || false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
    console.log("[v0] formatPhone - cleaned:", cleaned, "length:", cleaned.length)
    
    if (cleaned.length <= 2) return cleaned
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
    // Aceita até 12 dígitos: 2 (DDD) + 8-9 (número)
    // Formato: (XX) 9XXXX-XXXX ou (XX) XXXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!fullName.trim()) {
      newErrors.fullName = "Nome completo é obrigatório"
    }

    if (isProfessional) {
      if (!phone.trim()) {
        newErrors.phone = "Telefone é obrigatório para profissionais"
      } else if (!/^[\d\s\-\(\)]+$/.test(phone)) {
        newErrors.phone = "Telefone inválido"
      }

      if (!phoneValidated) {
        newErrors.phoneValidation = "Telefone precisa ser validado"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
    console.log("[v0] Phone digitado:", value)
    console.log("[v0] Phone formatado:", formatted)
    console.log("[v0] Phone limpo (apenas dígitos):", formatted.replace(/\D/g, ""))
    if (errors.phone) {
      setErrors({ ...errors, phone: undefined })
    }
  }

  const handlePhoneValidationSuccess = (validatedPhone: string) => {
    setPhone(validatedPhone)
    setPhoneValidated(true)
    setShowPhoneModal(false)
    if (errors.phoneValidation) {
      setErrors({ ...errors, phoneValidation: undefined })
    }
    toast({
      title: "Telefone validado!",
      description: "Seu telefone foi validado com sucesso.",
      variant: "success",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("fullName", fullName)
      formData.append("firstName", firstName)
      formData.append("lastName", lastName)
      formData.append("phone", phone)
      formData.append("city", city)
      formData.append("bio", bio)
      formData.append("isProfessional", isProfessional.toString())
      formData.append("skills", skills)

      await formAction(formData)

      toast({
        title: "Sucesso!",
        description: "Seu perfil foi atualizado.",
        variant: "success",
      })
      router.refresh()
    } catch (error) {
      console.error("Erro ao salvar perfil:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar o perfil. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Sucesso!",
        description: state.message,
      })
      router.refresh()
    } else if (state?.message && !state?.success) {
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
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

        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input 
            id="city" 
            placeholder="Sua cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Biografia</Label>
          <Textarea
            id="bio"
            placeholder="Conte um pouco sobre você..."
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        {/* Seção de Profissional */}
        <div className="border-t pt-6">
          <div className="flex items-center space-x-3 mb-6">
            <input
              id="isProfessional"
              type="checkbox"
              checked={isProfessional}
              onChange={(e) => {
                setIsProfessional(e.target.checked)
                if (!e.target.checked) {
                  setPhoneValidated(false)
                  setErrors({})
                }
              }}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <Label htmlFor="isProfessional" className="font-semibold cursor-pointer">
              Sou um profissional
            </Label>
          </div>

          {isProfessional && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Preencha as informações abaixo para ativar sua conta como profissional
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone">Telefone para Contato *</Label>
                  {phoneValidated && (
                    <span className="text-xs text-green-600 font-semibold">✓ Validado</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    placeholder="(11) 98765-4321"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    disabled={phoneValidated}
                    className={`${errors.phone ? "border-red-500" : ""}`}
                  />
                  {!phoneValidated && phone.trim() && (
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
                {errors.phoneValidation && (
                  <p className="text-sm text-red-500">{errors.phoneValidation}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Habilidades (separadas por vírgula)</Label>
                <Input
                  id="skills"
                  placeholder="Ex: Encanamento, Elétrica, Pintura"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Separe as habilidades com vírgulas.</p>
              </div>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </form>

      <PhoneValidationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={handlePhoneValidationSuccess}
        currentUserEmail={userEmail}
        phoneNumber={phone}
      />
    </Card>
  )
}
