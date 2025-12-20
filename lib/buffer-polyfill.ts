// Polyfill global para Buffer no servidor (Next.js runtime)
if (typeof Buffer === "undefined") {
  ;(global as any).Buffer = {
    from: (data: string | Uint8Array, encoding?: string) => {
      if (typeof data === "string") {
        // Converte string para Uint8Array
        const encoder = new TextEncoder()
        return encoder.encode(data)
      }
      return data
    },
    toString: (data: Uint8Array, encoding?: string) => {
      const decoder = new TextDecoder(encoding || "utf-8")
      return decoder.decode(data)
    },
  }
}

export {}
