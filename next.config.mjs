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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ]
  },
}

export default nextConfig
