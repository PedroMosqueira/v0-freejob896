import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "@/lib/buffer-polyfill"
import { Toaster } from "@/components/ui/toaster"
import { NotificationListener } from "@/components/notification-listener"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import { InstallAppDialog } from "@/components/install-app-dialog"

const inter = Inter({ subsets: ["latin"] })

export const dynamic = "force-dynamic"

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://freejob.services").replace(/\/$/, "")
const SITE_TITLE = "Freejob – Contrate serviços perto de você ou online"
const SITE_DESCRIPTION =
  "Peça um serviço em uma conversa rápida e receba orçamentos grátis de profissionais da sua região ou que atendem online. É profissional? Encontre novos clientes."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Freejob",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Freejob",
  keywords: [
    "contratar serviços",
    "orçamento grátis",
    "prestadores de serviço",
    "profissionais perto de mim",
    "serviços remotos",
    "serviços online",
    "freelancer",
    "trabalho remoto",
    "eletricista",
    "encanador",
    "diarista",
    "pintor",
    "pedreiro",
    "designer",
    "Freejob",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Freejob",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Freejob",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#2563eb",
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Freejob",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/icon-512.png`, width: 512, height: 512 },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Freejob",
      url: SITE_URL,
      inLanguage: "pt-BR",
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  console.log("[v0] 🔵 RootLayout carregado")

  return (
    <html lang="pt-BR" translate="no" className="bg-background" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  var currentDate = new Date().toLocaleString('pt-BR');
                  console.log('[v0] 🚀 Página carregada em: ' + currentDate);
                  console.log('[v0] ✅ Sistema de validação de EMAIL DUPLICADO está ATIVO!');
                  console.log('[v0] 📝 Melhorias implementadas:');
                  console.log('[v0]   - Detecção aprimorada de emails duplicados');
                  console.log('[v0]   - Mensagens de erro mais claras');
                  console.log('[v0]   - Opção para verificar status da conta');
                  console.log('[v0]   - Tratamento de rate limit melhorado');
                  
                  var originalBtoa = window.btoa;
                  window.btoa = function(str) {
                    try {
                      return originalBtoa(str);
                    } catch (e) {
                      // Converte UTF-8 para Base64 usando TextEncoder se disponível
                      if (typeof TextEncoder !== 'undefined') {
                        var bytes = new TextEncoder().encode(str);
                        var binary = '';
                        for (var i = 0; i < bytes.length; i++) {
                          binary += String.fromCharCode(bytes[i]);
                        }
                        return originalBtoa(binary);
                      }
                      // Fallback para método antigo
                      return originalBtoa(
                        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
                          return String.fromCharCode(parseInt(p1, 16));
                        })
                      );
                    }
                  };
                }
              })();
            `,
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className={`${inter.className} bg-background text-foreground`}>
        <ThemeProvider defaultTheme="system" storageKey="freejob-theme">
          <AuthProvider>
            {children}
            <NotificationListener />
          </AuthProvider>
          <Toaster />
          <InstallAppDialog />
        </ThemeProvider>

        <Script src="/register-sw.js" strategy="beforeInteractive" />
        <Analytics />
      </body>
    </html>
  )
}
