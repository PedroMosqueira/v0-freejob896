import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
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
        <Script src="/btoa-polyfill.js" strategy="beforeInteractive" />

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
