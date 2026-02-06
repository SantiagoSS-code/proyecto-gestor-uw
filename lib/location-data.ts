import { Country, State, City } from "country-state-city"

export type LocationLevel = "country" | "province" | "city" | "locality" | "postalCode"

export type LocationOption = {
  id: string
  label: string
  level: LocationLevel
  parentId?: string | null
  lat?: number | null
  lng?: number | null
}

type FetchLocationsParams = {
  level: LocationLevel
  parentId?: string | null
  search?: string
  maxResults?: number
  context?: {
    countryLabel?: string | null
    provinceLabel?: string | null
    cityLabel?: string | null
    countryId?: string | null
  }
}

const byLabel = (search: string) => {
  const needle = search.trim().toLowerCase()
  return (value: { name: string }) => (needle ? value.name.toLowerCase().includes(needle) : true)
}

const sortByLabel = (a: LocationOption, b: LocationOption) => a.label.localeCompare(b.label)

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: Record<string, string>
}

const uniqueByLabel = (items: LocationOption[]) => {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const pickAddressLabel = (result: NominatimResult, fallbacks: string[]) => {
  const address = result.address || {}
  const candidates = [
    address.suburb,
    address.neighbourhood,
    address.hamlet,
    address.village,
    address.town,
    address.city,
    address.municipality,
    address.county,
    ...fallbacks,
  ]
  return candidates.find(Boolean) || result.display_name
}

const searchGeo = async (query: string, limit: number) => {
  const url = `/api/geo/search?q=${encodeURIComponent(query)}&limit=${limit}`
  const response = await fetch(url)
  if (!response.ok) return []
  return (await response.json()) as NominatimResult[]
}

const searchGeoPostal = async (postalcode: string, countryCode: string | null, limit: number) => {
  const params = new URLSearchParams()
  params.set("postalcode", postalcode)
  params.set("limit", String(limit))
  if (countryCode) params.set("countrycodes", countryCode)
  const response = await fetch(`/api/geo/search?${params.toString()}`)
  if (!response.ok) return []
  return (await response.json()) as NominatimResult[]
}

// Data model change: structured, global locations derived deterministically from country-state-city + Nominatim search.
export async function fetchLocations({
  level,
  parentId = null,
  search = "",
  maxResults = 200,
  context,
}: FetchLocationsParams) {
  if (level === "country") {
    const items = Country.getAllCountries()
      .filter(byLabel(search))
      .map((country) => ({
        id: `country-${country.isoCode}`,
        label: country.name,
        level: "country" as const,
        parentId: null,
      }))
      .sort(sortByLabel)
    return items.slice(0, maxResults)
  }

  if (level === "province" && parentId) {
    const countryCode = parentId.replace("country-", "")
    const items = State.getStatesOfCountry(countryCode)
      .filter(byLabel(search))
      .map((state) => ({
        id: `province-${countryCode}-${state.isoCode}`,
        label: state.name,
        level: "province" as const,
        parentId,
      }))
      .sort(sortByLabel)
    return items.slice(0, maxResults)
  }

  if ((level === "city" || level === "locality" || level === "postalCode") && parentId) {
    const parts = parentId.split("-")
    const countryCode = parts[1]
    const stateCode = parts[2]

    const countryLabel = context?.countryLabel || ""
    const provinceLabel = context?.provinceLabel || ""
    const cityLabel = context?.cityLabel || ""
    const countryCodeFromContext = context?.countryId?.replace("country-", "") || null

    if (level === "postalCode") {
      if (!search.trim()) return []
      const results = await searchGeoPostal(search, countryCodeFromContext, Math.min(maxResults, 25))
      const postal = results
        .map((result) => result.address?.postcode || result.display_name)
        .filter(Boolean)
        .map((code, idx) => {
          const result = results[idx]
          return {
            id: `postal-${countryCode}-${stateCode}-${String(code).replace(/\s+/g, "")}`,
            label: String(code),
            level: "postalCode" as const,
            parentId,
            lat: result?.lat ? Number(result.lat) : null,
            lng: result?.lon ? Number(result.lon) : null,
          }
        }) as LocationOption[]
      return uniqueByLabel(postal).slice(0, maxResults)
    }

    if (level === "locality") {
      if (!search.trim()) return []
      const query = [search, cityLabel, provinceLabel, countryLabel].filter(Boolean).join(", ")
      const results = await searchGeo(query, Math.min(maxResults, 25))
      const items = results.map((result) => ({
        id: `locality-${result.place_id}`,
        label: pickAddressLabel(result, [result.display_name]),
        level: "locality" as const,
        parentId,
        lat: result.lat ? Number(result.lat) : null,
        lng: result.lon ? Number(result.lon) : null,
      }))
      return uniqueByLabel(items).slice(0, maxResults)
    }

    if (search.trim()) {
      const query = [search, provinceLabel, countryLabel].filter(Boolean).join(", ")
      const results = await searchGeo(query, Math.min(maxResults, 25))
      const items = results.map((result) => ({
        id: `city-${result.place_id}`,
        label: pickAddressLabel(result, [result.display_name]),
        level: "city" as const,
        parentId,
        lat: result.lat ? Number(result.lat) : null,
        lng: result.lon ? Number(result.lon) : null,
      }))
      return uniqueByLabel(items).slice(0, maxResults)
    }

    const cities = City.getCitiesOfState(countryCode, stateCode)
      .filter(byLabel(search))
      .map((city) => ({
        id: `city-${countryCode}-${stateCode}-${city.name}`,
        label: city.name,
        level: "city" as const,
        parentId,
      }))
      .sort(sortByLabel)

    return cities.slice(0, maxResults)
  }

  return []
}
