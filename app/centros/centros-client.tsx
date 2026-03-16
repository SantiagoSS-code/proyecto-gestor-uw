"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { collection, getDocs, query as firestoreQuery, where, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MapPin, Calendar, Clock, Search, ArrowLeft, Home, Star, SlidersHorizontal, Check } from "lucide-react"
import { FIRESTORE_COLLECTIONS } from "@/lib/firestorePaths"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type SortBy = "relevance" | "name-asc" | "name-desc" | "rating-desc" | "rating-asc"

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: "relevance", label: "Relevancia" },
  { value: "name-asc", label: "Nombre (A-Z)" },
  { value: "name-desc", label: "Nombre (Z-A)" },
  { value: "rating-desc", label: "Valoración (mayor a menor)" },
  { value: "rating-asc", label: "Valoración (menor a mayor)" },
]

interface OpeningHoursDay {
  open: string
  close: string
  closed: boolean
}

interface Center {
  id: string
  name: string
  slug?: string
  rating?: number
  address?: string
  city?: string
  country?: string
  coverImageUrl?: string | null
  galleryImageUrls?: string[]
  openingHours?: Record<string, OpeningHoursDay> | null
  sports?: string[]
}

const SPORT_LABELS: Record<string, string> = {
  padel: "Padel",
  tennis: "Tennis",
  futbol: "Fútbol",
  pickleball: "Pickleball",
  squash: "Squash",
}

const SPORT_EMOJIS: Record<string, string> = {
  padel: "🎾",
  tennis: "🎾",
  futbol: "⚽",
  pickleball: "🏓",
  squash: "🏸",
}

function getCover(center: Center) {
  return center.coverImageUrl || center.galleryImageUrls?.[0] || null
}

function getTodayDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function roundToStep(date: Date, stepMinutes: number) {
  const rounded = new Date(date)
  const minutes = rounded.getMinutes()
  const remainder = minutes % stepMinutes
  const delta = remainder >= stepMinutes / 2 ? stepMinutes - remainder : -remainder
  rounded.setMinutes(minutes + delta, 0, 0)
  return rounded
}

function getTimePlusHours(hours: number, stepMinutes = 30) {
  const now = new Date()
  now.setHours(now.getHours() + hours)
  const rounded = roundToStep(now, stepMinutes)
  const h = String(rounded.getHours()).padStart(2, "0")
  const m = String(rounded.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

function buildTimeOptions(stepMinutes = 30) {
  const options: string[] = []
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += stepMinutes) {
      const hh = String(h).padStart(2, "0")
      const mm = String(m).padStart(2, "0")
      options.push(`${hh}:${mm}`)
    }
  }
  return options
}

function parseDateParam(value: string | null) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

export default function CentersClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [locationQuery, setLocationQuery] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>(getTimePlusHours(3))
  const [sortBy, setSortBy] = useState<SortBy>("relevance")
  const [selectedSport, setSelectedSport] = useState<string>("")
  const [centers, setCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(true)
  const timeOptions = useMemo(() => buildTimeOptions(30), [])

  useEffect(() => {
    setLocationQuery(searchParams?.get("query") || "")
    setSelectedDate(parseDateParam(searchParams?.get("date") || null) || getTodayDate())
    setSelectedTime(searchParams?.get("time") || getTimePlusHours(3))

    const maybeSort = (searchParams?.get("sort") || "relevance") as SortBy
    const validSort: SortBy[] = ["relevance", "name-asc", "name-desc", "rating-desc", "rating-asc"]
    setSortBy(validSort.includes(maybeSort) ? maybeSort : "relevance")

    const maybeSport = searchParams?.get("sport") || ""
    const validSports = Object.keys(SPORT_LABELS)
    setSelectedSport(validSports.includes(maybeSport) ? maybeSport : "")
  }, [searchParams])

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const centersRef = collection(db, FIRESTORE_COLLECTIONS.centers)
        const q = firestoreQuery(centersRef, where("published", "==", true))
        const snapshot = await getDocs(q)
        const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Center, "id">) }))

        // Batch-load opening hours for each center in parallel
        const settingsResults = await Promise.all(
          data.map(async (center) => {
            try {
              const settingsRef = doc(db, "centers", center.id, "settings", "booking")
              const snap = await getDoc(settingsRef)
              if (snap.exists()) {
                return { id: center.id, openingHours: (snap.data().openingHours as Record<string, OpeningHoursDay>) || null }
              }
            } catch {}
            return { id: center.id, openingHours: null }
          })
        )
        const openingHoursMap = new Map(settingsResults.map((r) => [r.id, r.openingHours]))
        setCenters(data.map((c) => ({ ...c, openingHours: openingHoursMap.get(c.id) ?? null })))
      } catch (error) {
        console.error("Error loading centers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCenters()
  }, [])

  const availableSports = useMemo(() => {
    const sportsSet = new Set<string>()
    centers.forEach((c) => (c.sports || []).forEach((s) => sportsSet.add(s)))
    return Object.keys(SPORT_LABELS).filter((s) => sportsSet.has(s))
  }, [centers])

  const filteredAndSorted = useMemo(() => {
    const term = locationQuery.trim().toLowerCase()

    const base = centers.filter((center) => {
      const haystack = `${center.name} ${center.address || ""} ${center.city || ""} ${center.country || ""}`.toLowerCase()
      const matchesSearch = !term || haystack.includes(term)
      if (!matchesSearch) return false

      // Sport filter
      if (selectedSport && !(center.sports || []).includes(selectedSport)) return false

      // Opening hours filter: only apply when time is selected and center has hours configured
      if (selectedTime && selectedDate && center.openingHours) {
        const dayIndex = selectedDate.getDay().toString()
        const dayConfig = center.openingHours[dayIndex]
        if (dayConfig) {
          if (dayConfig.closed) return false
          const [sh, sm] = selectedTime.split(":").map(Number)
          const [oh, om] = dayConfig.open.split(":").map(Number)
          const [ch, cm] = dayConfig.close.split(":").map(Number)
          const timeMin = sh * 60 + sm
          const openMin = oh * 60 + om
          const closeMin = ch * 60 + cm
          if (timeMin < openMin || timeMin >= closeMin) return false
        }
      }

      return true
    })

    const sorted = [...base]
    switch (sortBy) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
        break
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name, "es", { sensitivity: "base" }))
        break
      case "rating-desc":
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case "rating-asc":
        sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0))
        break
      default:
        break
    }

    return sorted
  }, [centers, locationQuery, sortBy, selectedTime, selectedDate, selectedSport])

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }
    router.push("/")
  }

  const applySearchToUrl = () => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    if (locationQuery.trim()) params.set("query", locationQuery.trim())
    else params.delete("query")

    if (selectedDate) params.set("date", format(selectedDate, "yyyy-MM-dd"))
    else params.delete("date")

    if (selectedTime) params.set("time", selectedTime)
    else params.delete("time")

    if (sortBy !== "relevance") params.set("sort", sortBy)
    else params.delete("sort")

    if (selectedSport) params.set("sport", selectedSport)
    else params.delete("sport")

    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      <section className="max-w-6xl mx-auto px-4 pt-24 pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <Home className="w-4 h-4" />
                Inicio
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtro
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-2">
                <p className="text-xs text-muted-foreground px-2 pt-1 pb-2">Filtro</p>
                <div className="space-y-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        sortBy === option.value
                          ? "bg-secondary text-foreground font-medium"
                          : "hover:bg-secondary/60 text-foreground"
                      }`}
                      onClick={() => {
                        setSortBy(option.value)

                        const params = new URLSearchParams(searchParams?.toString() || "")
                        if (option.value !== "relevance") params.set("sort", option.value)
                        else params.delete("sort")

                        const queryString = params.toString()
                        router.replace(queryString ? `${pathname}?${queryString}` : pathname)
                      }}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.value ? <Check className="w-4 h-4 text-primary" /> : null}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <p className="text-sm text-muted-foreground">
              {loading ? "Buscando centros..." : `${filteredAndSorted.length} resultado${filteredAndSorted.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Buscar centros</h1>
          <p className="text-muted-foreground mt-2">Mantén tu búsqueda y ajusta filtros para ver resultados al instante.</p>
        </div>

        <div className="mb-8 w-full max-w-6xl mx-auto">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-2 shadow-lg shadow-black/5">
          <form
            className="flex flex-col md:flex-row gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              applySearchToUrl()
            }}
          >
            <div className="flex-1 h-12 px-4 rounded-xl bg-secondary/50 group hover:bg-secondary transition-colors flex items-center">
              <div className="flex items-center gap-3 w-full">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <Input
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="¿Dónde quieres jugar?"
                  className="w-full h-full bg-transparent border-0 shadow-none px-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                  aria-label="Ubicación"
                />
              </div>
            </div>

            <div className="flex-1 h-12 px-4 rounded-xl bg-secondary/50 group hover:bg-secondary transition-colors flex items-center">
              <div className="flex items-center gap-3 w-full">
                <Calendar className="w-5 h-5 text-primary shrink-0" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-full w-full justify-start px-0 py-0 text-left text-sm font-normal leading-none text-foreground"
                    >
                      {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span className="text-muted-foreground">Seleccionar fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <CalendarPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={es} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex-1 h-12 px-4 rounded-xl bg-secondary/50 group hover:bg-secondary transition-colors flex items-center">
              <div className="flex items-center gap-3 w-full">
                <Clock className="w-5 h-5 text-primary shrink-0" />
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="w-full bg-transparent border-0 px-0 py-0 h-full shadow-none">
                    <SelectValue className="text-sm leading-none" placeholder={selectedTime || "Seleccionar hora"} />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground h-12 px-6 rounded-xl flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              <span className="font-medium">Buscar</span>
            </Button>
          </form>
          </div>
        </div>

        {/* Sport filter pills */}
        {!loading && availableSports.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedSport("")
                const params = new URLSearchParams(searchParams?.toString() || "")
                params.delete("sport")
                const qs = params.toString()
                router.replace(qs ? `${pathname}?${qs}` : pathname)
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                !selectedSport
                  ? "bg-foreground text-background border-foreground"
                  : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary hover:text-foreground"
              }`}
            >
              Todos
            </button>
            {availableSports.map((sport) => (
              <button
                key={sport}
                type="button"
                onClick={() => {
                  const next = selectedSport === sport ? "" : sport
                  setSelectedSport(next)
                  const params = new URLSearchParams(searchParams?.toString() || "")
                  if (next) params.set("sport", next)
                  else params.delete("sport")
                  const qs = params.toString()
                  router.replace(qs ? `${pathname}?${qs}` : pathname)
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  selectedSport === sport
                    ? "bg-foreground text-background border-foreground"
                    : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span aria-hidden>{SPORT_EMOJIS[sport] ?? "🏅"}</span>
                {SPORT_LABELS[sport] ?? sport}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-muted-foreground">Cargando centros...</div>
        ) : filteredAndSorted.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border/80 p-8 text-center">
            <p className="text-foreground font-medium">No se encontraron centros para esta búsqueda.</p>
            <p className="text-sm text-muted-foreground mt-1">Prueba otra ubicación o elimina filtros de fecha y hora.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setLocationQuery("")
                  setSelectedDate(getTodayDate())
                  setSelectedTime(getTimePlusHours(3))
                  setSortBy("relevance")
                  setSelectedSport("")
                  router.replace(pathname)
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSorted.map((center) => {
              const centerParams = new URLSearchParams()
              if (locationQuery.trim()) centerParams.set("query", locationQuery.trim())
              if (selectedDate) centerParams.set("date", format(selectedDate, "yyyy-MM-dd"))
              if (selectedTime) centerParams.set("time", selectedTime)
              if (sortBy !== "relevance") centerParams.set("sort", sortBy)
              if (selectedSport) centerParams.set("sport", selectedSport)

              const detailHref = `/centros/${center.slug || center.id}${centerParams.toString() ? `?${centerParams.toString()}` : ""}`
              const ratingValue = typeof center.rating === "number" ? center.rating.toFixed(1) : "4.8"

              return (
                <Link
                  key={center.id}
                  href={detailHref}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/60 rounded-2xl"
                  aria-label={`Ir al club ${center.name}`}
                >
                  <Card className="group relative bg-card rounded-2xl border border-border/30 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-md">
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {getCover(center) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getCover(center) as string}
                          alt={center.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-100" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                        <span className="text-sm font-medium text-foreground">{ratingValue}</span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-foreground mb-1">{center.name}</h3>
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span className="text-xs leading-relaxed">
                          {center.address || [center.city, center.country].filter(Boolean).join(", ") || "Dirección no disponible"}
                        </span>
                      </div>

                      <div className="mt-5 flex justify-center">
                        <span className="inline-flex items-center justify-center rounded-full px-8 py-2 text-sm font-medium bg-blue-600 text-white group-hover:bg-blue-700">
                          Reservar
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}
