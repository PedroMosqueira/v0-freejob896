const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ""

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace("https://", "wss://")} https://api.stripe.com https://nominatim.openstreetmap.org https://viacep.com.br https://servicodados.ibge.gov.br https://vitals.vercel-insights.com`,
  "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'self'",
]
  .join("; ")
  .replace(/\s+/g, " ")

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    // /planos is the single plans page; old links and bookmarks land there.
    return [{ source: "/upgrade", destination: "/planos", permanent: true }]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          // Logged-in pages with payments and chat: block embedding by other sites (clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Location is used to find nearby services; camera and microphone are not used.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
          // Report-only: violations are logged in the browser console and nothing is blocked yet.
          { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
        ],
      },
    ]
  },
}

export default nextConfig
