// Fix btoa para suportar UTF-8
;(() => {
  if (typeof window !== "undefined") {
    const originalBtoa = window.btoa

    window.btoa = (str) => {
      try {
        // Tenta usar o btoa original primeiro (mais rápido para ASCII)
        return originalBtoa(str)
      } catch (e) {
        // Se falhar, converte UTF-8 para Latin1 primeiro
        return originalBtoa(unescape(encodeURIComponent(str)))
      }
    }

    console.log("[v0] btoa polyfill aplicado com sucesso")
  }
})()
