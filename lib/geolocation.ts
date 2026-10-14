"use client"

export interface DetectedLocation {
  latitude: number
  longitude: number
  city: string
  state: string
  neighborhood: string
}

const STATE_ABBR: Record<string, string> = {
  Acre: "AC", Alagoas: "AL", Amapá: "AP", Amazonas: "AM", Bahia: "BA", Ceará: "CE",
  "Distrito Federal": "DF", "Espírito Santo": "ES", Goiás: "GO", Maranhão: "MA",
  "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Minas Gerais": "MG", Pará: "PA",
  Paraíba: "PB", Paraná: "PR", Pernambuco: "PE", Piauí: "PI", "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS", Rondônia: "RO", Roraima: "RR",
  "Santa Catarina": "SC", "São Paulo": "SP", Sergipe: "SE", Tocantins: "TO",
}

function requestPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options))
}

/**
 * Mobile browsers often fail the first high-accuracy fix while GPS warms up,
 * which made users tap the button several times. Try a fast network/cached
 * fix first, then fall back to GPS with a longer timeout before giving up.
 */
async function getPosition(): Promise<GeolocationPosition> {
  try {
    return await requestPosition({ enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 8_000 })
  } catch (error) {
    if ((error as GeolocationPositionError)?.code === 1) throw error
    return requestPosition({ enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 })
  }
}

export function describeGeolocationError(error: unknown): string {
  const code = (error as GeolocationPositionError)?.code
  if (code === 1) return "Permissão de localização negada. Ative a localização do navegador ou preencha manualmente."
  if (code === 3) return "A localização demorou demais. Verifique se o GPS está ligado e tente novamente."
  return "Não foi possível obter sua localização. Tente novamente ou preencha manualmente."
}

export async function detectLocation(): Promise<DetectedLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Seu navegador não suporta geolocalização.")
  }

  const { latitude, longitude } = (await getPosition()).coords

  let address: Record<string, string> = {}
  try {
    const response = await fetch(`/api/geocode?q=${latitude},${longitude}&reverse=true`)
    if (response.ok) address = (await response.json())?.address ?? {}
  } catch {
    // Coordinates are still useful for distance even when reverse geocoding fails.
  }

  const stateName = address.state || ""
  return {
    latitude,
    longitude,
    city: address.city || address.town || address.village || address.municipality || "",
    state: STATE_ABBR[stateName] || address["ISO3166-2-lvl4"]?.replace("BR-", "") || stateName,
    neighborhood: address.suburb || address.neighbourhood || address.quarter || address.city_district || "",
  }
}
