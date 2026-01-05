// Limpa cookies corrompidos do Supabase que causam erro de UTF-8
export function cleanCorruptedCookies() {
  if (typeof window === "undefined") return

  const cookiesToClean = ["sb-access-token", "sb-refresh-token", "supabase-auth-token"]

  cookiesToClean.forEach((cookieName) => {
    // Tenta ler cada cookie do Supabase
    const cookies = document.cookie.split(";")
    cookies.forEach((cookie) => {
      const [name, value] = cookie.trim().split("=")
      if (name && name.includes(cookieName)) {
        try {
          // Tenta decodificar - se falhar, o cookie está corrompido
          if (value) {
            atob(value.split(".")[1] || "")
          }
        } catch (e) {
          // Cookie corrompido - deletar
          console.log("[v0] Removendo cookie corrompido:", name)
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
      }
    })
  })
}
