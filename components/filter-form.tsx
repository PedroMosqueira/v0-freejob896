"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface FilterFormProps {
  query: string
  setQuery: (value: string) => void
  city: string
  setCity: (value: string) => void
  status: string
  setStatus: (value: string) => void
  category: string
  setCategory: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function FilterForm({
  query,
  setQuery,
  city,
  setCity,
  status,
  setStatus,
  category,
  setCategory,
  onSubmit,
}: FilterFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 px-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="search-query" className="text-sm font-medium">
            Palavra-chave
          </Label>
          <Input
            id="search-query"
            placeholder="Ex: encanador"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="search-city" className="text-sm font-medium">
            Cidade
          </Label>
          <Input
            id="search-city"
            placeholder="Ex: Rio de Janeiro"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="search-status" className="text-sm font-medium">
            Status
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="search-status" className="text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="visita-proposta">Visita Proposta</SelectItem>
              <SelectItem value="aceito">Aceito</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="search-category" className="text-sm font-medium">
            Categoria
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="search-category" className="text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="eletricista">Eletricista</SelectItem>
              <SelectItem value="encanador">Encanador</SelectItem>
              <SelectItem value="pedreiro">Pedreiro</SelectItem>
              <SelectItem value="pintor">Pintor</SelectItem>
              <SelectItem value="marceneiro">Marceneiro</SelectItem>
              <SelectItem value="mecanico">Mecânico</SelectItem>
              <SelectItem value="jardineiro">Jardineiro</SelectItem>
              <SelectItem value="diarista">Diarista</SelectItem>
              <SelectItem value="outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
          Aplicar Filtros
        </Button>
      </div>
    </form>
  )
}
