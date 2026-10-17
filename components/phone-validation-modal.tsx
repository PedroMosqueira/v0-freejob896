"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { WhatsAppVerificationPanel } from "@/components/whatsapp-verification-panel"

interface PhoneValidationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (phone: string) => void
  currentUserEmail: string
  phoneNumber: string
  countryCode?: string
  /** Whether the user declared "Sou profissional"; required by the server to validate. */
  isProfessional: boolean
}

export function PhoneValidationModal({ isOpen, onClose, onSuccess, isProfessional }: PhoneValidationModalProps) {
  const { toast } = useToast()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Validar Telefone</DialogTitle>
          <DialogDescription>
            Envie o código pelo WhatsApp do número que você quer validar.
          </DialogDescription>
        </DialogHeader>

        {isOpen && (
          <WhatsAppVerificationPanel
            isProfessional={isProfessional}
            onVerified={(phone, message) => {
              toast({ title: "Sucesso!", description: message, variant: "success" })
              onSuccess(phone)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
