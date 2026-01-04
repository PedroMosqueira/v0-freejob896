// Polyfill para btoa que suporta UTF-8
// Executa antes de qualquer código React/Next.js carregar

;(() => {
  if (typeof window === "undefined") return

  var originalBtoa = window.btoa

  window.btoa = (str) => {
    try {
      // Tenta usar btoa nativo primeiro (mais rápido para ASCII)
      return originalBtoa(str)
    } catch (e) {
      // Fallback para UTF-8
      try {
        return originalBtoa(unescape(encodeURIComponent(str)))
      } catch (e2) {
        console.error("[v0] btoa UTF-8 conversion failed:", e2)
        throw e2
      }
    }
  }

  console.log("[v0] ✅ btoa UTF-8 polyfill loaded from public/btoa-utf8-fix.js")
})()
