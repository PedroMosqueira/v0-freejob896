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

// Polyfill global para btoa/atob que suporta UTF-8
if (typeof globalThis !== "undefined") {
  // Salva referências originais (se existirem)
  const originalBtoa = typeof globalThis.btoa !== "undefined" ? globalThis.btoa : null
  const originalAtob = typeof globalThis.atob !== "undefined" ? globalThis.atob : null

  // Implementação manual de Base64 encode
  function manualBtoa(input: string): string {
    const str = String(input)
    const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    let output = ""

    // Converte para UTF-8 bytes
    const utf8Bytes: number[] = []
    for (let j = 0; j < str.length; j++) {
      const charCode = str.charCodeAt(j)
      if (charCode < 0x80) {
        utf8Bytes.push(charCode)
      } else if (charCode < 0x800) {
        utf8Bytes.push(0xc0 | (charCode >> 6))
        utf8Bytes.push(0x80 | (charCode & 0x3f))
      } else if (charCode < 0xd800 || charCode >= 0xe000) {
        utf8Bytes.push(0xe0 | (charCode >> 12))
        utf8Bytes.push(0x80 | ((charCode >> 6) & 0x3f))
        utf8Bytes.push(0x80 | (charCode & 0x3f))
      } else {
        j++
        const nextCharCode = str.charCodeAt(j)
        const codePoint = 0x10000 + (((charCode & 0x3ff) << 10) | (nextCharCode & 0x3ff))
        utf8Bytes.push(0xf0 | (codePoint >> 18))
        utf8Bytes.push(0x80 | ((codePoint >> 12) & 0x3f))
        utf8Bytes.push(0x80 | ((codePoint >> 6) & 0x3f))
        utf8Bytes.push(0x80 | (codePoint & 0x3f))
      }
    }

    // Converte bytes para Base64
    let i = 0
    while (i < utf8Bytes.length) {
      const chr1 = utf8Bytes[i++]
      const chr2 = utf8Bytes[i++]
      const chr3 = utf8Bytes[i++]

      const enc1 = chr1 >> 2
      const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4)
      const enc3 = ((chr2 & 15) << 2) | (chr3 >> 6)
      const enc4 = chr3 & 63

      if (isNaN(chr2)) {
        output += base64Chars.charAt(enc1) + base64Chars.charAt(enc2) + "=="
      } else if (isNaN(chr3)) {
        output += base64Chars.charAt(enc1) + base64Chars.charAt(enc2) + base64Chars.charAt(enc3) + "="
      } else {
        output +=
          base64Chars.charAt(enc1) + base64Chars.charAt(enc2) + base64Chars.charAt(enc3) + base64Chars.charAt(enc4)
      }
    }

    return output
  }
  // Polyfill de btoa
  ;(globalThis as any).btoa = (str: string): string => {
    try {
      // Tenta usar btoa nativo para strings ASCII simples
      if (originalBtoa && !/[^\x00-\x7F]/.test(str)) {
        return originalBtoa(str)
      }
      // Usa implementação manual para UTF-8
      return manualBtoa(str)
    } catch (e) {
      return manualBtoa(str)
    }
  }

  // Polyfill de atob
  if (originalAtob) {
    ;(globalThis as any).atob = originalAtob
  }
}

export {}
