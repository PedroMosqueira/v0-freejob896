import { calculateTransactionFee } from "@/lib/transaction-manager"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Shield } from "lucide-react"

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

        {userRole && (
          <>
            <Separator />

            {userRole === "professional" && (
              <div className="space-y-2 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Você recebe</span>
                </div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  R$ {fee.serviceAmount.toFixed(2)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500">100% do valor do serviço</div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Comissão da taxa</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    +R$ {fee.professionalCommission.toFixed(2)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {fee.professionalCommissionPercent}% da taxa como comissão (disponível para saque)
                </div>
              </div>
            )}

            {userRole === "client" && (
              <div className="space-y-2 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-medium">Você ganha</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cashback em créditos</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    +R$ {fee.clientCashback.toFixed(2)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {fee.clientCashbackPercent}% da taxa volta como crédito para usar em próximas transações
                </div>
                <Separator className="my-2" />
                <div className="text-xs text-blue-600 dark:text-blue-500">
                  Garantia de 30 dias • Seguro contra serviço mal feito • Suporte prioritário
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
