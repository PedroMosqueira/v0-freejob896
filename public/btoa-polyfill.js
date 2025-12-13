// Polyfill para btoa() suportar UTF-8
// Fix para: "Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range."

;(() => {
  const originalBtoa = window.btoa

  window.btoa = (str) => {
    try {
      // Tenta usar btoa nativo primeiro
      return originalBtoa(str)
    } catch (e) {
      // Se falhar (caracteres UTF-8), converte para Base64 manualmente
      return originalBtoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(Number.parseInt(p1, 16))),
      )
    }
  }
})()
