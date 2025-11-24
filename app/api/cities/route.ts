import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get("state")
  const query = searchParams.get("q")

  if (!state) {
    return NextResponse.json({ error: "State parameter required" }, { status: 400 })
  }

  try {
    // Mapeamento de siglas para IDs do IBGE
    const stateIds: Record<string, string> = {
      AC: "12",
      AL: "27",
      AP: "16",
      AM: "13",
      BA: "29",
      CE: "23",
      DF: "53",
      ES: "32",
      GO: "52",
      MA: "21",
      MT: "51",
      MS: "50",
      MG: "31",
      PA: "15",
      PB: "25",
      PR: "41",
      PE: "26",
      PI: "22",
      RJ: "33",
      RN: "24",
      RS: "43",
      RO: "11",
      RR: "14",
      SC: "42",
      SP: "35",
      SE: "28",
      TO: "17",
    }

    const stateId = stateIds[state.toUpperCase()]
    if (!stateId) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 })
    }

    // Buscar municípios do estado na API do IBGE
    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`IBGE API error: ${response.status}`)
    }

    const cities = await response.json()

    // Filtrar cidades se houver query
    let filteredCities = cities
    if (query && query.length >= 2) {
      const queryLower = query.toLowerCase()
      filteredCities = cities.filter((city: any) => city.nome.toLowerCase().includes(queryLower))
    }

    // Limitar a 10 resultados
    const limitedCities = filteredCities.slice(0, 10)

    // Mapear para o formato esperado
    const result = limitedCities.map((city: any) => ({
      id: city.id,
      name: city.nome,
      state: state.toUpperCase(),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erro ao buscar cidades:", error)
    return NextResponse.json({ error: "Falha ao buscar cidades" }, { status: 500 })
  }
}
