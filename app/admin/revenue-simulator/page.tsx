"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, Users, DollarSign, Percent } from "lucide-react"

export default function RevenueSimulator() {
  // Parâmetros ajustáveis
  const [initialUsers, setInitialUsers] = useState(100)
  const [monthlyGrowthRate, setMonthlyGrowthRate] = useState(15) // %
  const [conversionRate, setConversionRate] = useState(10) // % de usuários que convertem para pago
  const [monthlyPlanPrice, setMonthlyPlanPrice] = useState(29.9)
  const [operationalCostPerUser, setOperationalCostPerUser] = useState(2.5)

  // Calcular projeções
  const calculateProjections = () => {
    const months = 24 // 2 anos de projeção
    const projections = []

    for (let month = 0; month < months; month++) {
      const users = Math.round(initialUsers * Math.pow(1 + monthlyGrowthRate / 100, month))
      const isFreeYear = month < 12
      const paidUsers = isFreeYear ? 0 : Math.round(users * (conversionRate / 100))
      const revenue = paidUsers * monthlyPlanPrice
      const costs = users * operationalCostPerUser
      const profit = revenue - costs

      projections.push({
        month: month + 1,
        year: Math.floor(month / 12) + 1,
        users,
        paidUsers,
        revenue,
        costs,
        profit,
        isFreeYear,
      })
    }

    return projections
  }

  const projections = calculateProjections()

  // Resumo financeiro
  const year1Total = projections.slice(0, 12).reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenue,
      costs: acc.costs + p.costs,
      profit: acc.profit + p.profit,
    }),
    { revenue: 0, costs: 0, profit: 0 },
  )

  const year2Total = projections.slice(12, 24).reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenue,
      costs: acc.costs + p.costs,
      profit: acc.profit + p.profit,
    }),
    { revenue: 0, costs: 0, profit: 0 },
  )

  const totalUsers = projections[23].users
  const totalPaidUsers = projections[23].paidUsers

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Simulador de Receita</h1>
        <p className="text-muted-foreground">Modelo: 1 ano grátis + plano mensal pago</p>
      </div>

      {/* Parâmetros ajustáveis */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Crescimento de Usuários</CardTitle>
            <CardDescription>Configure as projeções de crescimento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Usuários Iniciais: {initialUsers}</Label>
              <input
                type="range"
                value={initialUsers}
                onChange={(e) => setInitialUsers(Number(e.target.value))}
                min={50}
                max={5000}
                step={50}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Crescimento Mensal: {monthlyGrowthRate}%</Label>
              <input
                type="range"
                value={monthlyGrowthRate}
                onChange={(e) => setMonthlyGrowthRate(Number(e.target.value))}
                min={0}
                max={50}
                step={1}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Taxa de Conversão (gratuito → pago): {conversionRate}%</Label>
              <input
                type="range"
                value={conversionRate}
                onChange={(e) => setConversionRate(Number(e.target.value))}
                min={0}
                max={50}
                step={1}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valores Financeiros</CardTitle>
            <CardDescription>Configure preços e custos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Valor do Plano Mensal (R$)</Label>
              <Input
                type="number"
                value={monthlyPlanPrice}
                onChange={(e) => setMonthlyPlanPrice(Number.parseFloat(e.target.value) || 0)}
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label>Custo Operacional por Usuário (R$/mês)</Label>
              <Input
                type="number"
                value={operationalCostPerUser}
                onChange={(e) => setOperationalCostPerUser(Number.parseFloat(e.target.value) || 0)}
                step="0.10"
              />
              <p className="text-xs text-muted-foreground">
                Inclui: servidor, banco de dados, CDN, email, suporte, etc.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Executivo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Após 2 anos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Pagantes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPaidUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">No mês 24</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Ano 2</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {year2Total.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Total anual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Ano 2</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {year2Total.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Após custos</p>
          </CardContent>
        </Card>
      </div>

      {/* Análise por Ano */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ano 1 - Período Gratuito</CardTitle>
            <CardDescription>Foco em crescimento e engajamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receita Total:</span>
              <span className="font-bold">R$ 0,00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custos Totais:</span>
              <span className="font-bold text-red-600">
                -R$ {year1Total.costs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between border-t pt-4">
              <span className="font-semibold">Resultado:</span>
              <span className="font-bold text-red-600">
                -R$ {Math.abs(year1Total.profit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Investimento necessário para manter a plataforma no primeiro ano
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ano 2 - Monetização</CardTitle>
            <CardDescription>Início da cobrança de planos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receita Total:</span>
              <span className="font-bold text-green-600">
                +R$ {year2Total.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custos Totais:</span>
              <span className="font-bold text-red-600">
                -R$ {year2Total.costs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between border-t pt-4">
              <span className="font-semibold">Resultado:</span>
              <span className={`font-bold ${year2Total.profit > 0 ? "text-green-600" : "text-red-600"}`}>
                {year2Total.profit > 0 ? "+" : ""}R${" "}
                {year2Total.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {year2Total.profit > 0
                ? "Plataforma lucrativa no segundo ano"
                : "Continue crescendo para alcançar lucratividade"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Projeções Mensais */}
      <Card>
        <CardHeader>
          <CardTitle>Projeção Mensal Detalhada</CardTitle>
          <CardDescription>Evolução mês a mês dos primeiros 24 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Usuários</TableHead>
                <TableHead className="text-right">Pagantes</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Custos</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projections.map((p) => (
                <TableRow key={p.month} className={p.month === 12 || p.month === 13 ? "bg-muted/50" : ""}>
                  <TableCell className="font-medium">
                    Mês {p.month}
                    {p.month === 12 && (
                      <span className="ml-2 text-xs text-muted-foreground">(Fim do período gratuito)</span>
                    )}
                    {p.month === 13 && <span className="ml-2 text-xs text-green-600">(Início da cobrança)</span>}
                  </TableCell>
                  <TableCell className="text-right">{p.users.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{p.paidUsers > 0 ? p.paidUsers.toLocaleString() : "-"}</TableCell>
                  <TableCell className="text-right">
                    {p.revenue > 0 ? `R$ ${p.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    -R$ {p.costs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${p.profit > 0 ? "text-green-600" : "text-red-600"}`}>
                    {p.profit > 0 ? "+" : ""}R$ {p.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Análise e Recomendações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Ponto de Equilíbrio</h3>
            <p className="text-sm text-muted-foreground">
              Com os parâmetros atuais, você precisará de aproximadamente{" "}
              <span className="font-bold text-foreground">
                {Math.ceil(operationalCostPerUser / (monthlyPlanPrice * (conversionRate / 100)))} usuários
              </span>{" "}
              para cobrir os custos operacionais mensais.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Investimento Necessário</h3>
            <p className="text-sm text-muted-foreground">
              Para manter a plataforma gratuita por 1 ano, você precisará de um investimento de aproximadamente{" "}
              <span className="font-bold text-foreground">
                R$ {Math.abs(year1Total.profit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>{" "}
              para cobrir custos operacionais.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Receita Mensal Recorrente (MRR)</h3>
            <p className="text-sm text-muted-foreground">
              No final do mês 24, sua MRR será de aproximadamente{" "}
              <span className="font-bold text-foreground">
                R$ {projections[23].revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>{" "}
              com {projections[23].paidUsers.toLocaleString()} usuários pagantes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
