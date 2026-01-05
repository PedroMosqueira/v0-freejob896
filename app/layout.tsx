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

const btoaPolyfillScript = `
(function() {
  if (typeof window === "undefined") return;
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  window.btoa = function(str) {
    var utf8Str = unescape(encodeURIComponent(String(str)));
    var output = "";
    for (var i = 0; i < utf8Str.length; i += 3) {
      var chr1 = utf8Str.charCodeAt(i);
      var chr2 = utf8Str.charCodeAt(i + 1);
      var chr3 = utf8Str.charCodeAt(i + 2);
      var enc1 = chr1 >> 2;
      var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      var enc4 = chr3 & 63;
      if (isNaN(chr2)) { enc3 = enc4 = 64; }
      else if (isNaN(chr3)) { enc4 = 64; }
      output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
    }
    return output;
  };
})();
`

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
        <script dangerouslySetInnerHTML={{ __html: btoaPolyfillScript }} />

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
