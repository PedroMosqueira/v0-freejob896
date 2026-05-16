import { Card } from "@/components/ui/card"

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
      </div>
    </Card>
  )
}
