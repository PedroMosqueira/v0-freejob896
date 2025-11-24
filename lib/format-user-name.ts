/**
 * Formata o nome do usuário para exibição
 * Se houver nome completo, retorna o primeiro nome ou primeiro + último nome
 * Caso contrário, retorna a parte antes do @ do email
 */
export function formatUserName(fullName: string | undefined | null, email?: string, includeLastName = false): string {
  // Se não tem nome, usa o email
  if (!fullName || fullName.trim() === "") {
    return email ? email.split("@")[0] : "Usuário"
  }

  const nameParts = fullName.trim().split(/\s+/)

  if (includeLastName && nameParts.length > 1) {
    // Retorna primeiro + último nome
    return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
  }

  // Retorna apenas o primeiro nome
  return nameParts[0]
}

/**
 * Extrai apenas o primeiro nome do usuário
 * Retorna o primeiro nome do perfil ou a parte antes do @ do email
 */
export function getFirstName(fullName: string | undefined | null, email: string): string {
  if (!fullName || fullName.trim() === "") {
    return email.split("@")[0]
  }

  return fullName.trim().split(/\s+/)[0]
}

/**
 * Busca o nome do usuário a partir do email
 * Retorna um objeto com firstName e fullName para uso conveniente
 */
export async function getUserNameByEmail(email: string): Promise<{ firstName: string; fullName: string }> {
  try {
    const { getUserProfile } = await import("@/lib/user-profile")
    const profile = await getUserProfile(email)

    if (profile?.fullName) {
      const firstName = formatUserName(profile.fullName, email, false)
      const fullName = formatUserName(profile.fullName, email, true)
      return { firstName, fullName }
    }
  } catch (error) {
    console.error("Error fetching user name:", error)
  }

  // Fallback para email
  const emailName = email.split("@")[0]
  return { firstName: emailName, fullName: emailName }
}
