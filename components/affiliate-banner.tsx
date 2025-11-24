'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink } from 'lucide-react'

interface Product {
  name: string
  price: number
  image: string
  amazonLink: string
}

const productsByCategory: Record<string, Product[]> = {
  eletricista: [
    {
      name: "Multímetro Digital",
      price: 89.90,
      image: "/multimetro.jpg",
      amazonLink: "https://amzn.to/sua-tag-aqui-multimetro"
    },
    {
      name: "Kit Ferramentas Elétricas",
      price: 199.90,
      image: "/ferramentas.jpg",
      amazonLink: "https://amzn.to/sua-tag-aqui-kit"
    },
    {
      name: "Trena Laser 50m",
      price: 149.90,
      image: "/trena.jpg",
      amazonLink: "https://amzn.to/sua-tag-aqui-trena"
    }
  ],
  encanador: [
    {
      name: "Chave Grifo Profissional",
      price: 45.90,
      image: "/chave-grifo.jpg",
      amazonLink: "https://amzn.to/sua-tag-aqui-grifo"
    },
    {
      name: "Kit Vedação Completo",
      price: 79.90,
      image: "/vedacao.jpg",
      amazonLink: "https://amzn.to/sua-tag-aqui-vedacao"
    },
    {
      name: "Desentupidor Pressão",
      price: 119.90,
      image: "/desentupidor.jpg",
      amazonLink: "https://amzn.to/sua-tag-aqui-desentupidor"
    }
  ],
  marceneiro: [
    {
      name: "Serra Tico-Tico 800W",
      price: 349.90,
      image: "/serra.jpg",
      amazonLink: "https://amzn.to/sua-tag-aqui-serra"
    },
    {
      name: "Tupia Manual 1200W",
      price: 449.90,
      image: "/tupia.jpg",
      amazonLink: "https://amzn.to/sua-tag-aqui-tupia"
    },
    {
      name: "Jogo de Brocas 100pçs",
      price: 129.90,
      image: "/brocas.jpg",
      amazonLink: "https://amzn.to/sua-tag-aqui-brocas"
    }
  ]
}

export function AffiliateBanner() {
  // Produtos genéricos para todas as categorias
  const products = productsByCategory.eletricista

  return (
    <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">Ferramentas Recomendadas</h3>
          <p className="text-sm text-muted-foreground">Produtos selecionados para profissionais</p>
        </div>
        <span className="text-xs text-muted-foreground">Patrocinado</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map((product, idx) => (
          <div key={idx} className="flex gap-3 p-3 bg-white rounded-lg border">
            <img 
              src={product.image || "/placeholder.svg"} 
              alt={product.name}
              className="w-20 h-20 object-cover rounded"
            />
            <div className="flex-1 flex flex-col">
              <p className="font-medium text-sm line-clamp-2">{product.name}</p>
              <p className="text-lg font-bold text-green-600 mt-auto">
                R$ {product.price.toFixed(2)}
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                asChild
              >
                <a 
                  href={product.amazonLink} 
                  target="_blank" 
                  rel="nofollow sponsored noopener"
                  className="flex items-center gap-1"
                >
                  Ver Oferta
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Como associado da Amazon, recebemos por compras qualificadas
      </p>
    </Card>
  )
}
