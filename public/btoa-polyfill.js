// Polyfill btoa para suportar UTF-8
// Este arquivo DEVE ser carregado ANTES de qualquer outro JavaScript
;(() => {
  if (typeof window === "undefined") return

  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="

  window.btoa = (str) => {
    // Converte UTF-8 para Latin1
    var utf8Str = unescape(encodeURIComponent(String(str)))
    var output = ""

    for (var i = 0; i < utf8Str.length; i += 3) {
      var chr1 = utf8Str.charCodeAt(i)
      var chr2 = utf8Str.charCodeAt(i + 1)
      var chr3 = utf8Str.charCodeAt(i + 2)

      var enc1 = chr1 >> 2
      var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4)
      var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6)
      var enc4 = chr3 & 63

      if (isNaN(chr2)) {
        enc3 = enc4 = 64
      } else if (isNaN(chr3)) {
        enc4 = 64
      }

      output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4)
    }

    return output
  }

  console.log("[btoa-polyfill] UTF-8 support enabled")
})()
