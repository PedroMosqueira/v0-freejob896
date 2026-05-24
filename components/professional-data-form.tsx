"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { UserProfile } from "@/lib/user-profile"

interface ProfessionalDataFormProps {
  profile: UserProfile
  onUpdate?: () => void
}

export function ProfessionalDataForm({ profile, onUpdate }: ProfessionalDataFormProps) {
  const { toast } = useToast()
  const [isProfessional, setIsProfessional] = useState(profile.isProfessional || false)
  const [professionalPhone, setProfessionalPhone] = useState(profile.professionalPhone || profile.phone || "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [freeInterestsRemaining, setFreeInterestsRemaining] = useState(3)

  useEffect(() => {
    // Usar o contador correto de propostas gratuitas utilizadas
    const freeUsed = profile.freeInterestsCount || 0
    setFreeInterestsRemaining(Math.max(0, 3 - freeUsed))
  }, [profile.freeInterestsCount])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (isProfessional) {
      if (!professionalPhone.trim()) {
        newErrors.professionalPhone = "Telefone é obrigatório para profissionais"
      } else if (!/^[\d\s\-\(\)]+$/.test(professionalPhone)) {
        newErrors.professionalPhone = "Telefone inválido"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Erro na validação",
        description: "Por favor, corrija os erros abaixo.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/user/professional-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: profile.email,
          isProfessional,
          professionalPhone: isProfessional ? professionalPhone : null,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao salvar dados profissionais")
      }

      toast({
        title: "Sucesso!",
        description: "Dados profissionais atualizados com sucesso.",
        variant: "success",
      })

      onUpdate?.()
    } catch (error) {
      console.error("Error updating professional data:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar os dados profissionais.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-6 dark:bg-gray-800/50 dark:border-gray-700">
      <h3 className="text-xl font-semibold mb-6 dark:text-gray-100">Dados Profissionais</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Checkbox de Profissional */}
        <div className="flex items-center space-x-3 bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
          <input
            type="checkbox"
            id="isProfessional"
            checked={isProfessional}
            onChange={(e) => {
              setIsProfessional(e.target.checked)
              if (errors.professionalPhone) setErrors({ ...errors, professionalPhone: undefined })
            }}
            className="w-5 h-5 rounded cursor-pointer"
          />
          <Label htmlFor="isProfessional" className="text-sm cursor-pointer flex-1 font-medium dark:text-amber-100">
            Sou profissional que executa serviços
          </Label>
        </div>

        {/* Campos condicionais de profissional */}
        {isProfessional && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-4">
            <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
              ✓ Preencha seu telefone para gerenciar suas propostas
            </p>

            <div className="grid gap-1">
              <Label htmlFor="professionalPhone" className="text-xs sm:text-sm">
                Telefone para contato *
              </Label>
              <Input
                id="professionalPhone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={professionalPhone}
                onChange={(e) => {
                  setProfessionalPhone(e.target.value)
                  if (errors.professionalPhone) {
                    setErrors({ ...errors, professionalPhone: undefined })
                  }
                }}
                className={`text-xs sm:text-sm ${errors.professionalPhone ? "border-red-500" : ""}`}
              />
              {errors.professionalPhone && (
                <p className="text-xs text-red-500">{errors.professionalPhone}</p>
              )}
            </div>

            {/* Contador de propostas gratuitas */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p>
                  <strong>Propostas gratuitas:</strong> {freeInterestsRemaining} de 3 restant{freeInterestsRemaining === 1 ? "e" : "es"}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isProfessional && profile.isProfessional && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p>Você é um profissional registrado. Desmarque para remover o status de profissional.</p>
            </div>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
          {isSubmitting ? "Salvando..." : "Salvar Dados Profissionais"}
        </Button>
      </form>
    </Card>
  )
}
