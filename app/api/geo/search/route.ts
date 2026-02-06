import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()
  const postalcode = searchParams.get("postalcode")?.trim()
  const countrycodes = searchParams.get("countrycodes")?.trim()
  const limit = Number(searchParams.get("limit") || "10")

  if (!query && !postalcode) {
    return NextResponse.json([])
  }

  const url = new URL("https://nominatim.openstreetmap.org/search")
  if (postalcode) {
    url.searchParams.set("postalcode", postalcode)
  } else if (query) {
    url.searchParams.set("q", query)
  }
  if (countrycodes) {
    url.searchParams.set("countrycodes", countrycodes.toLowerCase())
  }
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("addressdetails", "1")
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 25)))

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Courtly/1.0",
      "Accept-Language": "es",
    },
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    return NextResponse.json([], { status: response.status })
  }

  const data = await response.json()
  return NextResponse.json(data)
}