// Este arquivo é carregado PRIMEIRO pelo Next.js, antes de qualquer outro código
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // O instrumentation roda tanto no servidor quanto no cliente
  // Precisamos aplicar o polyfill apenas no cliente (navegador)

  if (typeof window !== "undefined") {
    // Polyfill btoa para suportar UTF-8
    const originalBtoa = window.btoa

    window.btoa = (str: string): string => {
      try {
        // Tenta usar o btoa nativo primeiro (mais rápido para ASCII)
        return originalBtoa(str)
      } catch (e) {
        // Se falhar com UTF-8, converter para bytes primeiro
        const encoder = new TextEncoder()
        const bytes = encoder.encode(str)
        const binaryString = Array.from(bytes)
          .map((byte) => String.fromCharCode(byte))
          .join("")
        return originalBtoa(binaryString)
      }
    }

    console.log("[v0] btoa polyfill aplicado via instrumentation.ts")
  }
}
