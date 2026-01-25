import { Card } from "@/components/ui/card"
import { Gift } from "lucide-react"

interface TransactionBreakdownProps {
  serviceAmount: number
  userRole?: "professional" | "client"
}

export function TransactionBreakdown({ serviceAmount, userRole }: TransactionBreakdownProps) {
  return (
    <Card className="p-4 bg-green-50 dark:bg-green-950">
      <div className="space-y-3">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Valor do servico</span>
          <span>R$ {serviceAmount.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 rounded p-2">
          <Gift className="h-4 w-4" />
          <span className="text-sm font-medium">Plataforma gratuita no primeiro ano!</span>
        </div>
      </div>
    </Card>
  )
}
