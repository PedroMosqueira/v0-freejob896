import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const reverse = searchParams.get("reverse")

  if (!query) {
    return NextResponse.json({ error: "Query parameter required" }, { status: 400 })
  }

  try {
    let url: URL

    if (reverse === "true") {
      const [lat, lon] = query.split(",")
      url = new URL("https://nominatim.openstreetmap.org/reverse")
      url.searchParams.set("lat", lat.trim())
      url.searchParams.set("lon", lon.trim())
      url.searchParams.set("format", "json")
      url.searchParams.set("addressdetails", "1")
    } else {
      url = new URL("https://nominatim.openstreetmap.org/search")
      url.searchParams.set("q", query)
      url.searchParams.set("format", "json")
      url.searchParams.set("addressdetails", "1")
      url.searchParams.set("countrycodes", "br")
      url.searchParams.set("limit", "1")
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Freejob-App/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro ao buscar geocoding:", error)
    return NextResponse.json({ error: "Falha ao buscar localização" }, { status: 500 })
  }
}
