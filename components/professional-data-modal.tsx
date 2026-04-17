"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Loader2 } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

interface ProfessionalDataModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
  onComplete: () => void
}

export function ProfessionalDataModal({ isOpen, onClose, userEmail, onComplete }: ProfessionalDataModalProps) {
  const { toast } = useToast()
  const [cpf, setCpf] = useState("")
  const [phone, setPhone] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const isValidCPF = (cpfValue: string): boolean => {
    const cleanCpf = cpfValue.replace(/\D/g, "")
    if (cleanCpf.length !== 11) return false
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false

    let sum = 0
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i)
    }
    let remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false

    sum = 0
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i)
    }
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false

    return true
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!cpf.trim()) {
      newErrors.cpf = "CPF é obrigatório"
    } else {
      const cleanCpf = cpf.replace(/\D/g, "")
      if (cleanCpf.length !== 11) {
        newErrors.cpf = "CPF deve ter 11 dígitos"
      } else if (!isValidCPF(cpf)) {
        newErrors.cpf = "CPF inválido"
      }
    }

    if (!phone.trim()) {
      newErrors.phone = "Telefone é obrigatório"
    } else if (!/^[\d\s\-\(\)]+$/.test(phone)) {
      newErrors.phone = "Telefone inválido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()

      const { error } = await supabase
        .from("users")
        .update({
          is_professional: true,
          cpf: cpf.replace(/\D/g, ""),
          professional_phone: phone,
          free_interests_count: 0,
          total_interests_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("email", userEmail)

      if (error) {
        console.error("Erro ao salvar dados profissionais:", error)
        toast({
          title: "Erro",
          description: "Erro ao salvar seus dados profissionais",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Sucesso!",
        description: "Dados profissionais salvos! Agora você pode clicar em 'Tenho Interesse'.",
        variant: "success",
      })

      onComplete()
      onClose()
    } catch (error) {
      console.error("Erro inesperado:", error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao salvar dados",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete seus Dados Profissionais</DialogTitle>
          <DialogDescription>
            Para demonstrar interesse em serviços, complete seus dados profissionais.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-semibold mb-1">Benefícios:</p>
            <ul className="text-xs space-y-1">
              <li>✓ 3 propostas gratuitas</li>
              <li>✓ Receber solicitações de clientes</li>
              <li>✓ Gerenciar seu perfil profissional</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF (sem pontos) *</Label>
            <Input
              id="cpf"
              placeholder="00000000000"
              value={cpf}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 11)
                setCpf(value)
                if (errors.cpf) {
                  setErrors({ ...errors, cpf: undefined })
                }
              }}
              className={`${errors.cpf ? "border-red-500" : ""}`}
              maxLength={11}
            />
            {errors.cpf && (
              <p className="text-sm text-red-500">{errors.cpf}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone para Contato *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                if (errors.phone) {
                  setErrors({ ...errors, phone: undefined })
                }
              }}
              className={`${errors.phone ? "border-red-500" : ""}`}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSaving ? "Salvando..." : "Salvar e Continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
