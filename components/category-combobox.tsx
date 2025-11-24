"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from "@/lib/utils"

const categories = [
  "Encanador",
  "Eletricista",
  "Pedreiro",
  "Pintor",
  "Montador de Móveis",
  "Marceneiro",
  "Serralheiro",
  "Limpeza",
  "Jardinagem",
  "Diarista",
  "Dedetização",
  "Ar Condicionado",
  "Vidraceiro",
  "Chaveiro",
  "Mudanças",
  "Técnico de Informática",
  "Cabeleireiro",
  "Manicure",
  "Costureira",
  "Professor Particular",
  "Outros",
]

interface CategoryComboboxProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  includeAll?: boolean
}

export function CategoryCombobox({
  value,
  onValueChange,
  placeholder = "Selecione uma categoria...",
  className,
  includeAll = false,
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const allCategories = includeAll ? ["Todas as categorias", ...categories] : categories
  
  const filteredCategories = allCategories.filter((category) => {
    return category.toLowerCase().includes(search.toLowerCase())
  })

  const handleSelect = (category: string) => {
    const finalValue = category === "Todas as categorias" ? "all" : category
    onValueChange(finalValue)
    setSearch("")
    setOpen(false)
  }

  const displayValue = value === "all" ? "Todas as categorias" : value

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          type="text"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={displayValue || placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        <ChevronsUpDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredCategories.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma categoria encontrada
              </div>
            ) : (
              filteredCategories.map((category) => {
                const isSelected = category === displayValue
                return (
                  <button
                    key={category}
                    type="button"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent"
                    )}
                    onClick={() => handleSelect(category)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {category}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
