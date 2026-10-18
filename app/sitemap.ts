import type { MetadataRoute } from "next"

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://freejob.services").replace(/\/$/, "")

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/planos`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/suporte`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/termos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ]
}
