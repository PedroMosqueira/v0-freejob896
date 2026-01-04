function utf8ToBase64(str: string): string {
  try {
    // Tentar btoa original primeiro (mais rápido para ASCII puro)
    const testBtoa = typeof window !== "undefined" ? window.btoa || globalThis.btoa : globalThis.btoa
    if (testBtoa && typeof testBtoa === "function") {
      return testBtoa.call(typeof window !== "undefined" ? window : globalThis, str)
    }
  } catch (e) {
    // Continuar para método UTF-8
  }

  // Método robusto para UTF-8 usando TextEncoder
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")

  // Base64 encode manualmente se btoa não existir
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  let result = ""

  for (let i = 0; i < binString.length; i += 3) {
    const byte1 = binString.charCodeAt(i)
    const byte2 = i + 1 < binString.length ? binString.charCodeAt(i + 1) : 0
    const byte3 = i + 2 < binString.length ? binString.charCodeAt(i + 2) : 0

    result += base64Chars[byte1 >> 2]
    result += base64Chars[((byte1 & 0x3) << 4) | (byte2 >> 4)]
    result += i + 1 < binString.length ? base64Chars[((byte2 & 0xf) << 2) | (byte3 >> 6)] : "="
    result += i + 2 < binString.length ? base64Chars[byte3 & 0x3f] : "="
  }

  return result
}

if (typeof window !== "undefined") {
  window.btoa = utf8ToBase64
} else if (typeof globalThis !== "undefined") {
  ;(globalThis as any).btoa = utf8ToBase64
}

if (typeof Buffer === "undefined") {
  ;(global as any).Buffer = {
    from: (data: string | Uint8Array, encoding?: string) => {
      if (typeof data === "string") {
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
