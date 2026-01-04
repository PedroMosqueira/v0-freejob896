// Polyfill para btoa que suporta UTF-8
// Este arquivo deve ser importado antes de qualquer uso do Supabase

if (typeof window !== "undefined") {
  const originalBtoa = window.btoa

  window.btoa = (str: string): string => {
    try {
      // Tenta usar o btoa nativo primeiro (mais rápido para ASCII)
      return originalBtoa(str)
    } catch (e) {
      // Se falhar, usa TextEncoder para UTF-8
      const encoder = new TextEncoder()
      const bytes = encoder.encode(str)
      let binary = ""
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      return originalBtoa(binary)
    }
  }

  console.log("[v0] btoa polyfill aplicado com sucesso")
}

export {}
