import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get("city")
  const state = searchParams.get("state")
  const query = searchParams.get("q")

  console.log("[v0] Neighborhood API called:", { city, state, query })

  if (!city || !state || !query) {
    console.log("[v0] Missing required params, returning empty")
    return NextResponse.json([])
  }

  try {
    const searchQuery = `${query}, ${city}, ${state}, Brasil`
    const nominatimUrl =
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(searchQuery)}&` +
      `format=json&` +
      `addressdetails=1&` +
      `limit=8&` +
      `featuretype=suburb,neighbourhood,quarter`

    console.log("[v0] Nominatim URL:", nominatimUrl)

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "Freejob-App/1.0",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.log("[v0] Nominatim response not OK:", response.status)
      return NextResponse.json([])
    }

    const data = await response.json()
    console.log("[v0] Nominatim raw data:", data)

    const neighborhoods = data
      .filter((item: any) => {
        const address = item.address || {}
        return address.suburb || address.neighbourhood || address.quarter
      })
      .map((item: any) => {
        const address = item.address || {}
        const neighborhood = address.suburb || address.neighbourhood || address.quarter || ""
        return {
          name: neighborhood,
          lat: item.lat,
          lon: item.lon,
          displayName: `${neighborhood}, ${city} - ${state}`,
        }
      })
      .filter((item: any, index: number, self: any[]) => {
        return index === self.findIndex((t) => t.name === item.name)
      })

    console.log("[v0] Processed neighborhoods:", neighborhoods)

    return NextResponse.json(neighborhoods.slice(0, 8))
  } catch (error) {
    console.error("[v0] Neighborhood search error:", error)
    return NextResponse.json([])
  }
}
