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
import { COUNTRIES } from "@/lib/countries"
import { Edit2, X } from "lucide-react"

interface ProfileFormProps {
  profile: UserProfile
  userEmail: string
}

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const [state, formAction] = useFormState(updateUserProfile, null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [fullName, setFullName] = useState(profile.fullName || "")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState(profile.phone || "")
  const [originalPhone, setOriginalPhone] = useState(profile.phone || "")
  const [countryCode, setCountryCode] = useState("+55")
  const [isProfessional, setIsProfessional] = useState(profile.isProfessional || false)
  const [skills, setSkills] = useState(profile.skills?.join(", ") || "")
  const [city, setCity] = useState(profile.city || "")
  const [bio, setBio] = useState(profile.bio || "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [phoneValidated, setPhoneValidated] = useState(profile.phoneValidated || false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneValid, setPhoneValid] = useState(false)
  const [phoneStatus, setPhoneStatus] = useState<"invalid" | "valid" | "">("")
  const { toast } = useToast()
  const router = useRouter()

  // Limpar telefone para comparação
  const cleanPhone = (p: string) => p.replace(/\D/g, "")
  const phoneChanged = cleanPhone(phone) !== cleanPhone(originalPhone)

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
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validar nome: precisa ter pelo menos primeiro e último nome
    if (!fullName.trim()) {
      newErrors.fullName = "Nome completo é obrigatório"
    } else {
      const nameParts = fullName.trim().split(/\s+/).filter(Boolean)
      if (nameParts.length < 2) {
        newErrors.fullName = "Por favor, informe seu nome e sobrenome"
      }
    }

    if (isProfessional) {
      if (!phone.trim()) {
        newErrors.phone = "Telefone é obrigatório para profissionais"
      } else if (phoneChanged && !phoneValid) {
        // Só validar formato se o número foi mexido
        newErrors.phone = "Telefone inválido"
      }

      // Só obrigar validação se o telefone mudou
      // Se não mudou e já está validado, está OK
      if (phoneChanged && !phoneValidated) {
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

  // Função para validar telefone em tempo real
  const validatePhoneFormat = (phoneValue: string): boolean => {
    // Extrair apenas números
    const cleanedPhone = phoneValue.replace(/\D/g, "")
    // Telefone brasileiro padrão: 11 dígitos (2 de DDD + 9 do número)
    // Pode começar com 9 ou 8 (celular ou fixo)
    const isValid = cleanedPhone.length === 11 || cleanedPhone.length === 10
    return isValid
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value)
    setPhone(formatted)
    
    // Validar formato em tempo real
    const isValid = validatePhoneFormat(formatted)
    setPhoneValid(isValid)
    
    if (formatted.trim()) {
      setPhoneStatus(isValid ? "valid" : "invalid")
    } else {
      setPhoneStatus("")
    }
    
    // Se o telefone mudou, resetar validação
    if (phoneChanged && phoneValidated) {
      setPhoneValidated(false)
    }
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
      // Extrair first e last name do fullName
      const { first, last } = extractNameParts(fullName)
      
      const formData = new FormData()
      formData.append("firstName", first)
      formData.append("lastName", last)
      formData.append("city", city)
      formData.append("bio", bio)
      formData.append("isProfessional", isProfessional.toString())
      formData.append("skills", skills)
      formData.append("isClient", (!isProfessional).toString())

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
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold dark:text-gray-100">Informações do Perfil</h3>
        {!isEditMode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditMode(true)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Editar
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditMode(false)}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        )}
      </div>

      {!isEditMode && (
        <div className="space-y-4 mb-6 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Nome Completo</p>
            <p className="text-lg">{fullName || "Não informado"}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Cidade</p>
            <p>{city || "Não informada"}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Bio</p>
            <p>{bio || "Não informada"}</p>
          </div>
          {isProfessional && (
            <>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Telefone</p>
                <p>{phone || "Não informado"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Habilidades</p>
                <p>{skills || "Não informadas"}</p>
              </div>
            </>
          )}
        </div>
      )}

      {isEditMode && (
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

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Telefone para Contato *</Label>
                    <div className="flex items-center gap-2">
                      {phoneValidated && !phoneChanged && (
                        <span className="text-xs text-green-600 font-semibold">✓ Verificado</span>
                      )}
                      {phoneStatus === "valid" && !phoneValidated && (
                        <span className="text-xs text-green-600 font-semibold">✓ Válido</span>
                      )}
                      {phoneStatus === "invalid" && phone.trim() && (
                        <span className="text-xs text-red-600 font-semibold">✗ Inválido</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-shrink-0">
                      <select
                        id="country"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        disabled={phoneValidated && !phoneChanged}
                        className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                      >
                        {COUNTRIES.map((country) => (
                          <option key={`${country.code}-${country.name}`} value={country.code}>
                            {country.flag} {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 flex gap-2">
                      <Input
                        id="phone"
                        placeholder="11 99123-4567"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        disabled={phoneValidated && !phoneChanged}
                        maxLength={20}
                        className={`${
                          phoneStatus === "valid" ? "border-green-500" : phoneStatus === "invalid" ? "border-red-500" : ""
                        }`}
                      />
                      {phoneValidated && !phoneChanged ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled
                          className="whitespace-nowrap"
                        >
                          Verificado
                        </Button>
                      ) : phoneValid && phoneChanged ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowPhoneModal(true)}
                          className="whitespace-nowrap"
                        >
                          Validar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          disabled
                          className="whitespace-nowrap"
                        >
                          Validar
                        </Button>
                      )}
                    </div>
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone}</p>
                  )}
                  {errors.phoneValidation && (
                    <p className="text-sm text-red-500">{errors.phoneValidation}</p>
                  )}
                </div>
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
      )}

      <PhoneValidationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={handlePhoneValidationSuccess}
        currentUserEmail={userEmail}
        phoneNumber={phone}
        countryCode={countryCode}
      />
    </Card>
  )
}
