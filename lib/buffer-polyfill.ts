// O navegador moderno já tem btoa nativo que funciona
// Apenas definimos btoa no servidor Node.js onde não existe

function utf8ToBase64Manual(str: string): string {
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

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

// Não sobrescrever no navegador
if (typeof globalThis !== "undefined" && typeof globalThis.btoa === "undefined") {
  ;(globalThis as any).btoa = utf8ToBase64Manual
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
