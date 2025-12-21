function utf8ToBase64Manual(str: string): string {
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

  // Converte string para UTF-8 bytes
  const utf8Bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i)
    if (charCode < 0x80) {
      utf8Bytes.push(charCode)
    } else if (charCode < 0x800) {
      utf8Bytes.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f))
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      utf8Bytes.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f))
    } else {
      // Surrogate pair
      i++
      const surrogate = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
      utf8Bytes.push(
        0xf0 | (surrogate >> 18),
        0x80 | ((surrogate >> 12) & 0x3f),
        0x80 | ((surrogate >> 6) & 0x3f),
        0x80 | (surrogate & 0x3f),
      )
    }
  }

  // Converte bytes para Base64
  let result = ""
  for (let i = 0; i < utf8Bytes.length; i += 3) {
    const byte1 = utf8Bytes[i]
    const byte2 = i + 1 < utf8Bytes.length ? utf8Bytes[i + 1] : 0
    const byte3 = i + 2 < utf8Bytes.length ? utf8Bytes[i + 2] : 0

    result += base64Chars[byte1 >> 2]
    result += base64Chars[((byte1 & 0x3) << 4) | (byte2 >> 4)]
    result += i + 1 < utf8Bytes.length ? base64Chars[((byte2 & 0xf) << 2) | (byte3 >> 6)] : "="
    result += i + 2 < utf8Bytes.length ? base64Chars[byte3 & 0x3f] : "="
  }

  return result
}

// Sobrescreve btoa no navegador para suportar UTF-8
if (typeof window !== "undefined") {
  const originalBtoa = window.btoa
  window.btoa = (str: string): string => {
    // Tenta usar a versão nativa para ASCII simples (melhor performance)
    if (!/[^\x00-\x7F]/.test(str)) {
      try {
        return originalBtoa.call(window, str)
      } catch (e) {
        // Fallback para implementação manual
      }
    }
    // Usa implementação manual para UTF-8
    return utf8ToBase64Manual(str)
  }
}

// Define btoa no servidor Node.js onde não existe nativamente
if (typeof globalThis !== "undefined" && typeof globalThis.btoa === "undefined") {
  ;(globalThis as any).btoa = utf8ToBase64Manual
}

// Polyfill para Buffer no servidor
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
