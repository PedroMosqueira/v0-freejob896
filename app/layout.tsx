import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "@/lib/buffer-polyfill"
import { Toaster } from "@/components/ui/toaster"
import { NotificationListener } from "@/components/notification-listener"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import Script from "next/script"
import { InstallAppDialog } from "@/components/install-app-dialog"

const inter = Inter({ subsets: ["latin"] })

export const dynamic = "force-dynamic"

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://freejob.service").replace(/\/$/, "")
const SITE_DESCRIPTION =
  "Publique o serviço que você precisa e receba propostas de profissionais perto de você, ou encontre clientes para o seu trabalho."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Freejob – Encontre ou ofereça serviços perto de você",
    template: "%s | Freejob",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Freejob",
  keywords: ["serviços", "profissionais", "freelancer", "orçamento", "prestadores de serviço", "Freejob"],
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Freejob",
    title: "Freejob – Encontre ou ofereça serviços perto de você",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Freejob – Encontre ou ofereça serviços perto de você",
    description: SITE_DESCRIPTION,
  },
  generator: "v0.app",
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

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Freejob" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX"
          crossOrigin="anonymous"
          strategy="lazyOnload"
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
      </body>
    </html>
  )
}
