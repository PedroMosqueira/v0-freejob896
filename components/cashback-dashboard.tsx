"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Gift, Wallet, DollarSign } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface CashbackDashboardProps {
  userEmail: string
  userRole: "professional" | "client"
}

export function CashbackDashboard({ userEmail, userRole }: CashbackDashboardProps) {
  const [cashbackData, setCashbackData] = useState<{
    balance: number
    totalEarned: number
  } | null>(null)

  useEffect(() => {
    fetch(`/api/cashback/balance?email=${userEmail}`)
      .then((res) => res.json())
      .then((data) => setCashbackData(data))
  }, [userEmail])

  if (!cashbackData) return null

  return (
    <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {userRole === "professional" ? (
              <Wallet className="h-5 w-5 text-green-600" />
            ) : (
              <Gift className="h-5 w-5 text-green-600" />
            )}
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              {userRole === "professional" ? "Suas Comissões" : "Seus Créditos"}
            </h3>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <TrendingUp className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-green-700 dark:text-green-400">
              R$ {cashbackData.balance.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground">
              {userRole === "professional" ? "disponível para saque" : "disponível"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">Total acumulado: R$ {cashbackData.totalEarned.toFixed(2)}</div>
        </div>

        {userRole === "professional" && (
          <div className="space-y-3">
            <div className="text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
              Você ganha 30% da taxa de cada transação realizada na plataforma como comissão!
            </div>

            <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
              <DollarSign className="mr-2 h-4 w-4" />
              Solicitar Saque
            </Button>
          </div>
        )}

        {userRole === "client" && (
          <div className="text-sm text-muted-foreground">
            Use seus créditos para pagar a taxa da plataforma em suas próximas contratações
          </div>
        )}
      </div>
    </Card>
  )
}
