import type { MetadataRoute } from "next"

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://freejob.service").replace(/\/$/, "")

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/profile", "/payment-success", "/upgrade"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
