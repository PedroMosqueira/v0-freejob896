import { calculateTransactionFee } from "@/lib/transaction-manager"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Shield } from "lucide-react"

interface TransactionBreakdownProps {
  serviceAmount: number
  userRole?: "professional" | "client"
}

export function TransactionBreakdown({ serviceAmount, userRole }: TransactionBreakdownProps) {
  const fee = calculateTransactionFee(serviceAmount)

  return (
    <Card className="p-4 bg-muted/50">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Valor do serviço</span>
          <span className="font-medium">R$ {fee.serviceAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center text-amber-600">
          <span className="text-sm flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Taxa de segurança ({fee.platformFeePercent}%)
          </span>
          <span className="font-medium">+ R$ {fee.platformFee.toFixed(2)}</span>
        </div>

        <Separator />

        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total a pagar</span>
          <span>R$ {fee.totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </Card>
  )
}
