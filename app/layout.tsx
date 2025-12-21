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
  if (typeof window === 'undefined') return;
  
  // Tabela de caracteres Base64
  var base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  
  // Implementação completamente manual de Base64 - NUNCA chama btoa nativo
  function utf8ToBas64(str) {
    var output = '';
    var utf8Bytes = [];
    
    // Converte string para UTF-8 bytes
    for (var i = 0; i < str.length; i++) {
      var charCode = str.charCodeAt(i);
      if (charCode < 0x80) {
        utf8Bytes.push(charCode);
      } else if (charCode < 0x800) {
        utf8Bytes.push(0xc0 | (charCode >> 6));
        utf8Bytes.push(0x80 | (charCode & 0x3f));
      } else if (charCode < 0xd800 || charCode >= 0xe000) {
        utf8Bytes.push(0xe0 | (charCode >> 12));
        utf8Bytes.push(0x80 | ((charCode >> 6) & 0x3f));
        utf8Bytes.push(0x80 | (charCode & 0x3f));
      } else {
        i++;
        var nextChar = str.charCodeAt(i);
        var codePoint = 0x10000 + (((charCode & 0x3ff) << 10) | (nextChar & 0x3ff));
        utf8Bytes.push(0xf0 | (codePoint >> 18));
        utf8Bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
        utf8Bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
        utf8Bytes.push(0x80 | (codePoint & 0x3f));
      }
    }
    
    // Converte bytes para Base64
    for (var j = 0; j < utf8Bytes.length; j += 3) {
      var b1 = utf8Bytes[j];
      var b2 = utf8Bytes[j + 1];
      var b3 = utf8Bytes[j + 2];
      
      var enc1 = b1 >> 2;
      var enc2 = ((b1 & 3) << 4) | (b2 >> 4);
      var enc3 = ((b2 & 15) << 2) | (b3 >> 6);
      var enc4 = b3 & 63;
      
      if (typeof b2 === 'undefined') {
        enc3 = enc4 = 64;
      } else if (typeof b3 === 'undefined') {
        enc4 = 64;
      }
      
      output += base64Chars.charAt(enc1);
      output += base64Chars.charAt(enc2);
      output += enc3 === 64 ? '=' : base64Chars.charAt(enc3);
      output += enc4 === 64 ? '=' : base64Chars.charAt(enc4);
    }
    
    return output;
  }
  
  // Sobrescreve window.btoa com implementação manual
  window.btoa = function(str) {
    return utf8ToBase64(String(str));
  };
  
  // Corrige o nome da função
  window.btoa = function(str) {
    return utf8ToBas64(String(str));
  };
})();
            `,
          }}
        />
        {/* </CHANGE> */}

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
