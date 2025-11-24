"use client"

import { Card } from "@/components/ui/card"
import { ExternalLink } from 'lucide-react'
import { Button } from "@/components/ui/button"

export function SimpleAffiliateBanner() {
  const products = [
    {
      name: "Kit Ferramentas",
      price: "R$ 199,90",
      image: "/placeholder.svg?height=100&width=100&text=Ferramentas",
      link: "https://amzn.to/3exemplo1" // Substitua com seu link de afiliado real
    },
    {
      name: "Multímetro Digital",
      price: "R$ 89,90",
      image: "/placeholder.svg?height=100&width=100&text=Multimetro",
      link: "https://amzn.to/3exemplo2"
    },
    {
      name: "Trena Laser 50m",
      price: "R$ 149,90",
      image: "/placeholder.svg?height=100&width=100&text=Trena",
      link: "https://amzn.to/3exemplo3"
    }
  ]

  return (
    <Card className="group relative overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 rounded-none border aspect-square p-4">
      <div className="relative w-full h-full flex flex-col">
        <div className="mb-2">
          <div className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">FERRAMENTAS RECOMENDADAS</div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Produtos para Profissionais</h3>
        </div>
        
        <div className="flex-1 space-y-2 overflow-y-auto">
          {products.map((product, idx) => (
            <a
              key={idx}
              href={product.link}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors group/item"
            >
              <img 
                src={product.image || "/placeholder.svg"} 
                alt={product.name}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold">{product.price}</p>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover/item:text-green-600" />
            </a>
          ))}
        </div>
        
        <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Anúncio · Amazon</p>
        </div>
      </div>
    </Card>
  )
}
