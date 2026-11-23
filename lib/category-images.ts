const CATEGORY_SLUGS: Record<string, string> = {
  encanador: "encanador",
  eletricista: "eletricista",
  pedreiro: "pedreiro",
  pintor: "pintor",
  "montador de moveis": "montador-de-moveis",
  montador: "montador-de-moveis",
  marceneiro: "marceneiro",
  serralheiro: "serralheiro",
  limpeza: "limpeza",
  faxineiro: "limpeza",
  jardinagem: "jardinagem",
  jardineiro: "jardinagem",
  diarista: "diarista",
  dedetizacao: "dedetizacao",
  "ar condicionado": "ar-condicionado",
  vidraceiro: "vidraceiro",
  chaveiro: "chaveiro",
  mudancas: "mudancas",
  "tecnico de informatica": "tecnico-de-informatica",
  cabeleireiro: "cabeleireiro",
  manicure: "manicure",
  costureira: "costureira",
  "professor particular": "professor-particular",
  outros: "outros",
}

function normalizeCategory(category: string): string {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .trim()
    .toLowerCase()
}

/** Generic illustrative image for a service category, used when the request has no photos. */
export function getCategoryImage(category: string | null | undefined): string {
  const slug = CATEGORY_SLUGS[normalizeCategory(category ?? "")] ?? "outros"
  return `/images/categories/${slug}.jpg`
}

/** First photo of the request, or the category image when the requester sent none. */
export function getNeedCoverImage(need: { images?: string[] | null; category?: string | null }): string {
  return need.images?.[0] || getCategoryImage(need.category)
}
