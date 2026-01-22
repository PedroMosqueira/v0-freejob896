// Polyfill para btoa que suporta UTF-8
// Deve ser importado no lado do cliente antes de usar Supabase

export function installBtoaUtf8Polyfill() {
  if (typeof window === "undefined") return

  const originalBtoa = window.btoa

  // Sobrescrever btoa com versão que suporta UTF-8
  window.btoa = (str: string): string => {
    try {
      // Tentar usar btoa nativo primeiro (mais rápido para ASCII)
      return originalBtoa(str)
    } catch (e) {
      // Se falhar (caracteres UTF-8), usar conversão manual
      // Converter UTF-8 string para base64
      const utf8Bytes = new TextEncoder().encode(str)
      let binary = ""
      utf8Bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
      })
      return originalBtoa(binary)
    }
  }
}
