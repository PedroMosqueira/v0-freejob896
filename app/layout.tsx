import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "@/lib/buffer-polyfill"
import { Toaster } from "@/components/ui/toaster"
import { NotificationListener } from "@/components/notification-listener"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { auth } from "@/auth"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Freejob",
  description: "Encontre ou ofereça serviços de forma fácil e rápida.",
  icons: {
    icon: "/favicon.ico",
  },
  generator: "v0.app",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  console.log("[v0] 🔵 Layout - Session:", session ? `User: ${session.user?.email}` : "No session")
  const plainSession = session ? structuredClone(session) : null

  return (
    <html lang="en" translate="no" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
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
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Freejob" />
        <link rel="apple-touch-icon" href="/images/logo.png" />

        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      </head>
      <body className={`${inter.className} bg-background text-foreground`}>
        <ThemeProvider defaultTheme="system" storageKey="freejob-theme">
          <AuthProvider session={plainSession}>
            {children}
            <NotificationListener />
          </AuthProvider>
          <Toaster />
        </ThemeProvider>

        <Script src="/register-sw.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
