export function getCategoryImage(category: string): string {
  const categoryMap: Record<string, string> = {
    Encanador: "/images/categories/encanador.jpg",
    Eletricista: "/images/categories/eletricista.jpg",
    Pedreiro: "/images/categories/pedreiro.jpg",
    Pintor: "/images/categories/pintor.jpg",
    "Montador de Móveis": "/images/categories/montador-moveis.jpg",
    Marceneiro: "/images/categories/marceneiro.jpg",
    Serralheiro: "/images/categories/serralheiro.jpg",
    Limpeza: "/images/categories/limpeza.jpg",
    Jardinagem: "/images/categories/jardinagem.jpg",
    Diarista: "/images/categories/diarista.jpg",
    Dedetização: "/images/categories/dedetizacao.jpg",
    "Ar Condicionado": "/images/categories/ar-condicionado.jpg",
    Vidraceiro: "/images/categories/vidraceiro.jpg",
    Chaveiro: "/images/categories/chaveiro.jpg",
    Mudanças: "/images/categories/mudancas.jpg",
    "Técnico de Informática": "/images/categories/tecnico-informatica.jpg",
    Cabeleireiro: "/images/categories/cabeleireiro.jpg",
    Manicure: "/images/categories/manicure.jpg",
    Costureira: "/images/categories/costureira.jpg",
    "Professor Particular": "/images/categories/professor-particular.jpg",
    Outros: "/images/categories/outros.jpg",
  }

  return categoryMap[category] || "/images/categories/outros.jpg"
}
